// pmudataconcentrator.client/src/app/core/services/pmu-data.service.ts
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HubConnection, HubConnectionBuilder, LogLevel, HubConnectionState } from '@microsoft/signalr';
import { Observable, Subject, from, interval, BehaviorSubject } from 'rxjs';
import { map, filter, bufferTime, distinctUntilChanged } from 'rxjs/operators';
import { PmuData, PmuConfiguration, PowerSystemEvent, EventType, EventSeverity } from '../models/pmu-data.model';

const environment = {
  production: false,
  apiUrl: 'http://localhost:5242'
};

interface SystemState {
  timestamp: Date;
  avgFrequency: number;
  avgVoltage: number;
  maxAngleSpread: number;
  systemInertia: number;
  damping: number;
}

interface VoltageStabilityMetrics {
  vsi: number; // Voltage Stability Index
  lmpi: number; // Line Stability Index
  fvsi: number; // Fast Voltage Stability Index
  vcpi: number; // Voltage Collapse Proximity Index
  criticalBuses: number[];
  weakestBus: number;
  margin: number;
}

interface PowerFlowData {
  busId: number;
  voltage: number;
  angle: number;
  activePower: number;
  reactivePower: number;
  generation: number;
  load: number;
}

@Injectable({
  providedIn: 'root'
})
export class PmuDataService {
  private hubConnection!: HubConnection;
  private pmuDataSubject = new Subject<PmuData>();
  private eventSubject = new Subject<PowerSystemEvent>();
  private systemStateSubject = new BehaviorSubject<SystemState>({
    timestamp: new Date(),
    avgFrequency: 60.0,
    avgVoltage: 1.0,
    maxAngleSpread: 0,
    systemInertia: 5.0,
    damping: 1.0
  });
  
  private voltageStabilitySubject = new BehaviorSubject<VoltageStabilityMetrics>({
    vsi: 1.0,
    lmpi: 0,
    fvsi: 0,
    vcpi: 0,
    criticalBuses: [],
    weakestBus: 0,
    margin: 100
  });
  
  private pmuDataMap = signal<Map<number, PmuData>>(new Map());
  public pmuDataList = computed(() => Array.from(this.pmuDataMap().values()));
  
  // Power flow data for advanced calculations
  private powerFlowData = new Map<number, PowerFlowData>();
  
  // System parameters
  private readonly systemBase = 100; // MVA
  private readonly nominalFrequency = 60.0; // Hz
  private readonly frequencyDeadband = 0.036; // Hz
  private readonly rocofThreshold = 1.0; // Hz/s
  
  // Connection state
  private connectionState = signal<HubConnectionState>(HubConnectionState.Disconnected);
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // ms
  
  constructor(private http: HttpClient) {
    this.initializeSignalR();
    this.startSystemCalculations();
  }

  private initializeSignalR(): void {
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/pmudata`)
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          if (retryContext.previousRetryCount >= this.maxReconnectAttempts) {
            return null;
          }
          return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
        }
      })
      .configureLogging(LogLevel.Information)
      .build();

    // Connection event handlers
    this.hubConnection.onreconnecting((error) => {
      console.log('Reconnecting to SignalR hub...', error);
      this.connectionState.set(HubConnectionState.Reconnecting);
    });

    this.hubConnection.onreconnected((connectionId) => {
      console.log('Reconnected to SignalR hub', connectionId);
      this.connectionState.set(HubConnectionState.Connected);
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
    });

    this.hubConnection.onclose((error) => {
      console.log('SignalR connection closed', error);
      this.connectionState.set(HubConnectionState.Disconnected);
      this.attemptReconnect();
    });

    // Data event handlers
    this.hubConnection.on('ReceivePmuData', (data: PmuData) => {
      this.processPmuData(data);
    });

    this.hubConnection.on('InitialData', (dataList: PmuData[]) => {
      const map = new Map<number, PmuData>();
      dataList.forEach(data => {
        const normalized = this.normalizePmuData(data);
        map.set(normalized.pmuId, normalized);
      });
      this.pmuDataMap.set(map);
      this.updateSystemState();
    });

    this.hubConnection.on('ReceiveEvent', (event: PowerSystemEvent) => {
      this.processSystemEvent(event);
    });

    this.hubConnection.on('ReceiveAnalytics', (analytics: any) => {
      console.log('Received analytics:', analytics);
    });

    this.startConnection();
  }

  private async startConnection(): Promise<void> {
    try {
      await this.hubConnection.start();
      console.log('SignalR connected successfully');
      this.connectionState.set(HubConnectionState.Connected);
      
      // Subscribe to all PMUs
      for (let i = 1; i <= 118; i++) {
        await this.subscribeToPmu(i);
      }
    } catch (err) {
      console.error('Error establishing SignalR connection:', err);
      this.connectionState.set(HubConnectionState.Disconnected);
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
    
    setTimeout(() => {
      this.startConnection();
    }, this.reconnectDelay);
    
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  private async subscribeToPmu(pmuId: number): Promise<void> {
    if (this.hubConnection.state === HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('SubscribeToPmu', pmuId);
      } catch (err) {
        console.error(`Failed to subscribe to PMU ${pmuId}:`, err);
      }
    }
  }

  private processPmuData(data: any): void {
    const normalizedData = this.normalizePmuData(data);
    
    // Update PMU data map
    this.pmuDataMap.update(map => {
      const newMap = new Map(map);
      newMap.set(normalizedData.pmuId, normalizedData);
      return newMap;
    });
    
    // Update power flow data
    this.updatePowerFlowData(normalizedData);
    
    // Check for anomalies
    this.detectAnomalies(normalizedData);
    
    // Emit to subscribers
    this.pmuDataSubject.next(normalizedData);
    
    // Update system state
    this.updateSystemState();
  }


  private normalizePmuData(data: any): PmuData {
    // Normalize both camelCase and PascalCase properties
    const normalized: PmuData = {
      id: data.id ?? data.Id,
      pmuId: data.pmuId ?? data.PmuId,
      timestamp: data.timestamp ?? data.Timestamp,
      socTimestamp: data.socTimestamp ?? data.SocTimestamp,
      fracSec: data.fracSec ?? data.FracSec,
      phasors: this.normalizePhasors(data.phasors ?? data.Phasors ?? []),
      frequency: data.frequency ?? data.Frequency ?? 60.0,
      rocof: data.rocof ?? data.Rocof ?? 0,
      status: data.status ?? data.Status ?? 0,
      quality: data.quality ?? data.Quality ?? 0,
      latitude: data.latitude ?? data.Latitude ?? 0,
      longitude: data.longitude ?? data.Longitude ?? 0,
      stationName: data.stationName ?? data.StationName ?? ''
    };
    
    return normalized;
  }

  private normalizePhasors(phasors: any[]): any[] {
    return phasors.map(phasor => ({
      name: phasor.name ?? phasor.Name,
      type: phasor.type ?? phasor.Type,
      value: {
        real: phasor.value?.real ?? phasor.Value?.Real ?? 0,
        imaginary: phasor.value?.imaginary ?? phasor.Value?.Imaginary ?? 0
      },
      magnitude: phasor.magnitude ?? phasor.Magnitude ?? 0,
      angle: phasor.angle ?? phasor.Angle ?? 0
    }));
  }

  private updatePowerFlowData(pmuData: PmuData): void {
    if (!pmuData.phasors || pmuData.phasors.length === 0) return;
    
    const voltagePhasor = pmuData.phasors.find(p => p.type === 0);
    const currentPhasor = pmuData.phasors.find(p => p.type === 1);
    
    if (voltagePhasor && currentPhasor) {
      const voltage = voltagePhasor.magnitude / 345000; // Convert to p.u. (assuming 345kV base)
      const angle = voltagePhasor.angle;
      
      // Calculate power
      const S = voltage * currentPhasor.magnitude * 1.732 / 1000; // MVA
      const powerFactor = 0.95; // Assumed
      const activePower = S * powerFactor;
      const reactivePower = S * Math.sqrt(1 - powerFactor * powerFactor);
      
      this.powerFlowData.set(pmuData.pmuId, {
        busId: pmuData.pmuId,
        voltage,
        angle,
        activePower,
        reactivePower,
        generation: activePower > 0 ? activePower : 0,
        load: activePower < 0 ? Math.abs(activePower) : 0
      });
    }
  }

  private detectAnomalies(pmuData: PmuData): void {
    const events: PowerSystemEvent[] = [];
    
    // Frequency anomalies
    const freqDev = Math.abs(pmuData.frequency - this.nominalFrequency);
    if (freqDev > 0.5) {
      events.push({
        id: `freq-${pmuData.pmuId}-${Date.now()}`,
        timestamp: new Date(),
        pmuId: pmuData.pmuId,
        eventType: EventType.FrequencyDeviation,
        severity: freqDev > 1.0 ? EventSeverity.Critical : EventSeverity.Warning,
        description: `Frequency deviation: ${pmuData.frequency.toFixed(3)} Hz (${freqDev > 0 ? '+' : ''}${(freqDev).toFixed(3)} Hz)`,
        isAcknowledged: false
      });
    }
    
    // ROCOF anomalies
    if (Math.abs(pmuData.rocof) > this.rocofThreshold) {
      events.push({
        id: `rocof-${pmuData.pmuId}-${Date.now()}`,
        timestamp: new Date(),
        pmuId: pmuData.pmuId,
        eventType: EventType.RapidFrequencyChange,
        severity: Math.abs(pmuData.rocof) > 2.0 ? EventSeverity.Emergency : EventSeverity.Critical,
        description: `High ROCOF detected: ${pmuData.rocof.toFixed(3)} Hz/s`,
        isAcknowledged: false
      });
    }
    
    // Voltage anomalies
    if (pmuData.phasors && pmuData.phasors.length > 0) {
      const voltagePhasor = pmuData.phasors.find(p => p.type === 0);
      if (voltagePhasor) {
        const voltagePU = voltagePhasor.magnitude / 345000;
        if (voltagePU < 0.95 || voltagePU > 1.05) {
          events.push({
            id: `voltage-${pmuData.pmuId}-${Date.now()}`,
            timestamp: new Date(),
            pmuId: pmuData.pmuId,
            eventType: EventType.VoltageViolation,
            severity: voltagePU < 0.9 || voltagePU > 1.1 ? EventSeverity.Critical : EventSeverity.Warning,
            description: `Voltage violation: ${voltagePU.toFixed(3)} p.u.`,
            isAcknowledged: false
          });
        }
      }
    }
    
    // Emit events
    events.forEach(event => this.eventSubject.next(event));
  }

  private updateSystemState(): void {
    const pmuList = this.pmuDataList();
    if (pmuList.length === 0) return;
    
    // Calculate average frequency
    const frequencies = pmuList.map(pmu => pmu.frequency);
    const avgFrequency = frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length;
    
    // Calculate average voltage
    let voltageSum = 0;
    let voltageCount = 0;
    
    pmuList.forEach(pmu => {
      if (pmu.phasors && pmu.phasors.length > 0) {
        const vPhasor = pmu.phasors.find(p => p.type === 0);
        if (vPhasor) {
          voltageSum += vPhasor.magnitude / 345000; // Convert to p.u.
          voltageCount++;
        }
      }
    });
    
    const avgVoltage = voltageCount > 0 ? voltageSum / voltageCount : 1.0;
    
    // Calculate maximum angle spread
    const angles = pmuList
      .filter(pmu => pmu.phasors && pmu.phasors.length > 0)
      .map(pmu => {
        const vPhasor = pmu.phasors.find(p => p.type === 0);
        return vPhasor ? vPhasor.angle : 0;
      });
    
    const maxAngle = Math.max(...angles);
    const minAngle = Math.min(...angles);
    const maxAngleSpread = maxAngle - minAngle;
    
    // Update system state
    this.systemStateSubject.next({
      timestamp: new Date(),
      avgFrequency,
      avgVoltage,
      maxAngleSpread,
      systemInertia: this.calculateSystemInertia(pmuList),
      damping: this.calculateSystemDamping(pmuList)
    });
    
    // Calculate voltage stability metrics
    this.calculateVoltageStability();
  }

  private calculateSystemInertia(pmuList: PmuData[]): number {
    // Simplified inertia calculation based on frequency response
    const rocofs = pmuList.map(pmu => Math.abs(pmu.rocof));
    const avgRocof = rocofs.reduce((sum, r) => sum + r, 0) / rocofs.length;
    
    // H = ΔP / (2 * f * ROCOF)
    const deltaP = 0.02; // Assumed 2% power imbalance
    return avgRocof > 0 ? deltaP / (2 * this.nominalFrequency * avgRocof) : 5.0;
  }

  private calculateSystemDamping(pmuList: PmuData[]): number {
    // Simplified damping calculation
    const freqDevs = pmuList.map(pmu => Math.abs(pmu.frequency - this.nominalFrequency));
    const avgFreqDev = freqDevs.reduce((sum, d) => sum + d, 0) / freqDevs.length;
    
    return avgFreqDev > 0 ? 1 / avgFreqDev : 1.0;
  }

  private calculateVoltageStability(): void {
    const powerFlowArray = Array.from(this.powerFlowData.values());
    if (powerFlowArray.length === 0) return;
    
    // Calculate Voltage Stability Index (VSI)
    let vsiSum = 0;
    let weakestVSI = 1.0;
    let weakestBus = 0;
    const criticalBuses: number[] = [];
    
    powerFlowArray.forEach(bus => {
      // Simplified VSI calculation: VSI = |V|² / (|V|² + 4 * X * Q)
      const X = 0.1; // Assumed reactance
      const vsi = (bus.voltage * bus.voltage) / 
                   (bus.voltage * bus.voltage + 4 * X * Math.abs(bus.reactivePower) / this.systemBase);
      
      vsiSum += vsi;
      
      if (vsi < weakestVSI) {
        weakestVSI = vsi;
        weakestBus = bus.busId;
      }
      
      if (vsi < 0.7) {
        criticalBuses.push(bus.busId);
      }
    });
    
    const avgVSI = vsiSum / powerFlowArray.length;
    
    // Calculate Line Stability Index (LMPI)
    const lmpi = this.calculateLMPI(powerFlowArray);
    
    // Calculate Fast Voltage Stability Index (FVSI)
    const fvsi = this.calculateFVSI(powerFlowArray);
    
    // Calculate Voltage Collapse Proximity Index (VCPI)
    const vcpi = 1 - avgVSI;
    
    // Calculate stability margin
    const margin = weakestVSI * 100;
    
    this.voltageStabilitySubject.next({
      vsi: avgVSI,
      lmpi,
      fvsi,
      vcpi,
      criticalBuses,
      weakestBus,
      margin
    });
  }

  private calculateLMPI(powerFlow: PowerFlowData[]): number {
    // L-index calculation for load buses
    let maxL = 0;
    
    powerFlow.forEach(bus => {
      if (bus.load > 0) { // Load bus
        // Simplified L-index: L = |1 - Σ(Fji * Vi/Vj)|
        const L = Math.abs(1 - bus.voltage);
        maxL = Math.max(maxL, L);
      }
    });
    
    return maxL;
  }

  private calculateFVSI(powerFlow: PowerFlowData[]): number {
    // Fast Voltage Stability Index
    let maxFVSI = 0;
    
    // Simplified FVSI calculation
    powerFlow.forEach(bus => {
      const P = bus.activePower / this.systemBase;
      const Q = bus.reactivePower / this.systemBase;
      const V = bus.voltage;
      const X = 0.1; // Assumed line reactance
      
      const fvsi = (4 * X * Q) / (V * V);
      maxFVSI = Math.max(maxFVSI, fvsi);
    });
    
    return maxFVSI;
  }

  private startSystemCalculations(): void {
    // Periodic system state calculations
    interval(1000).subscribe(() => {
      this.updateSystemState();
    });
    
    // Buffer PMU data for batch processing
    this.pmuDataSubject
      .pipe(
        bufferTime(100), // Buffer for 100ms
        filter(buffer => buffer.length > 0)
      )
      .subscribe(buffer => {
        // Process batch of PMU data
        this.processBatchData(buffer);
      });
  }

  private processBatchData(pmuDataBatch: PmuData[]): void {
    // Perform system-wide calculations on batched data
    // This is more efficient than processing each PMU update individually
    
    // Update frequency statistics
    const frequencies = pmuDataBatch.map(pmu => pmu.frequency);
    const freqStats = this.calculateStatistics(frequencies);
    
    // Check for inter-area oscillations
    if (freqStats.stdDev > 0.05) {
      this.eventSubject.next({
        id: `oscillation-${Date.now()}`,
        timestamp: new Date(),
        eventType: EventType.FrequencyDeviation,
        severity: EventSeverity.Warning,
        description: `Inter-area oscillation detected: σ = ${freqStats.stdDev.toFixed(3)} Hz`,
        isAcknowledged: false
      });
    }
  }

  private calculateStatistics(values: number[]): { mean: number; stdDev: number; min: number; max: number } {
    const n = values.length;
    if (n === 0) return { mean: 0, stdDev: 0, min: 0, max: 0 };
    
    const mean = values.reduce((sum, v) => sum + v, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    return { mean, stdDev, min, max };
  }

  private processSystemEvent(event: PowerSystemEvent): void {
    // Process and enrich system events
    this.eventSubject.next(event);
    
    // Update system state based on event
    if (event.severity >= EventSeverity.Critical) {
      console.warn('Critical system event:', event);
      // Trigger additional analysis or actions
    }
  }

  // Public API methods
  getConnectionState(): Observable<HubConnectionState> {
    return from([this.connectionState()]);
  }

  getPmuDataStream(): Observable<PmuData> {
    return this.pmuDataSubject.asObservable();
  }

  getEventStream(): Observable<PowerSystemEvent> {
    return this.eventSubject.asObservable();
  }

  getSystemState(): Observable<SystemState> {
    return this.systemStateSubject.asObservable();
  }

  getVoltageStability(): Observable<VoltageStabilityMetrics> {
    return this.voltageStabilitySubject.asObservable();
  }

  getLatestData(): Observable<PmuData[]> {
    return this.http.get<PmuData[]>(`${environment.apiUrl}/api/pmu/data/latest`);
  }

  getHistoricalData(pmuId: number, start: Date, end: Date, resolution?: number): Observable<PmuData[]> {
    const params = {
      pmuId: pmuId.toString(),
      start: start.toISOString(),
      end: end.toISOString(),
      ...(resolution && { resolution: resolution.toString() })
    };
    
    return this.http.get<PmuData[]>(`${environment.apiUrl}/api/pmu/data/historical`, { params });
  }

  getConfigurations(): Observable<PmuConfiguration[]> {
    return this.http.get<PmuConfiguration[]>(`${environment.apiUrl}/api/pmu/configurations`);
  }

  getAnalytics(pmuId: number, start: Date, end: Date): Observable<any> {
    return this.http.get(`${environment.apiUrl}/api/pmu/analytics/${pmuId}`, {
      params: {
        start: start.toISOString(),
        end: end.toISOString()
      }
    });
  }

  async requestAnalytics(pmuId: number, start: Date, end: Date): Promise<void> {
    if (this.hubConnection.state === HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('RequestAnalytics', pmuId, start, end);
      } catch (err) {
        console.error('Failed to request analytics:', err);
      }
    }
  }

  exportData(request: any): Observable<{ path: string }> {
    return this.http.post<{ path: string }>(`${environment.apiUrl}/api/pmu/export`, request);
  }

  acknowledgeEvent(eventId: string): void {
    // In a real implementation, this would update the database
    console.log('Acknowledging event:', eventId);
  }

  // Advanced analysis methods
  performModalAnalysis(): Observable<any> {
    // Perform small-signal stability analysis
    const systemState = this.systemStateSubject.value;
    const powerFlow = Array.from(this.powerFlowData.values());
    
    // Simplified modal analysis
    const modes = this.calculateSystemModes(systemState, powerFlow);
    
    return from([{
      modes,
      dominantMode: modes[0],
      damping: modes.map(m => m.damping),
      participation: this.calculateParticipationFactors(modes)
    }]);
  }

  private calculateSystemModes(state: SystemState, powerFlow: PowerFlowData[]): any[] {
    // Simplified eigenvalue calculation for demonstration
    const modes = [];
    
    // Inter-area mode
    modes.push({
      frequency: 0.3 + Math.random() * 0.2,
      damping: 0.05 + Math.random() * 0.1,
      type: 'inter-area'
    });
    
    // Local modes
    for (let i = 0; i < 3; i++) {
      modes.push({
        frequency: 0.8 + Math.random() * 0.5,
        damping: 0.1 + Math.random() * 0.15,
        type: 'local'
      });
    }
    
    return modes;
  }

  private calculateParticipationFactors(modes: any[]): Map<number, number[]> {
    const factors = new Map<number, number[]>();
    
    // Simplified participation factor calculation
    this.powerFlowData.forEach((bus, busId) => {
      const participation = modes.map(() => Math.random());
      factors.set(busId, participation);
    });
    
    return factors;
  }

  calculateTransientStability(fault: any): Observable<any> {
    // Perform transient stability analysis
    const timeline = [];
    const duration = 5; // seconds
    const dt = 0.01; // time step
    
    let time = 0;
    let frequency = this.nominalFrequency;
    let rocof = 0;
    
    while (time < duration) {
      // Simplified swing equation
      const powerImbalance = fault.severity * Math.exp(-time / fault.clearingTime);
      rocof = -powerImbalance / (2 * this.systemStateSubject.value.systemInertia);
      frequency += rocof * dt;
      
      timeline.push({
        time,
        frequency,
        rocof,
        stable: Math.abs(frequency - this.nominalFrequency) < 2.0
      });
      
      time += dt;
    }
    
    return from([{
      timeline,
      criticalClearingTime: this.calculateCCT(fault),
      stable: timeline[timeline.length - 1].stable
    }]);
  }

  private calculateCCT(fault: any): number {
    // Simplified critical clearing time calculation
    const H = this.systemStateSubject.value.systemInertia;
    const Pm = 1.0; // Mechanical power
    const Pe = 1.0 - fault.severity; // Electrical power during fault
    
    return Math.sqrt(2 * H * Math.PI / (Pm - Pe));
  }
}





