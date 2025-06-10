import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { Observable, Subject, from } from 'rxjs';
import { PmuData, PmuConfiguration, PmuAnalytics, PowerSystemEvent } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PmuDataService {
  private hubConnection: HubConnection;
  private pmuDataSubject = new Subject<PmuData>();
  private eventSubject = new Subject<PowerSystemEvent>();
  
  // Signals for reactive state
  private pmuDataMap = signal<Map<number, PmuData>>(new Map());
  public pmuDataList = computed(() => Array.from(this.pmuDataMap().values()));
  
  constructor(private http: HttpClient) {
    this.initializeSignalR();
  }

  private initializeSignalR(): void {
    this.hubConnection = new HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/hubs/pmudata`)
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Information)
      .build();

    this.hubConnection.on('ReceivePmuData', (data: PmuData) => {
      this.updatePmuData(data);
      this.pmuDataSubject.next(data);
    });

    this.hubConnection.on('InitialData', (dataList: PmuData[]) => {
      const map = new Map<number, PmuData>();
      dataList.forEach(data => map.set(data.pmuId, data));
      this.pmuDataMap.set(map);
    });

    this.hubConnection.on('ReceiveEvent', (event: PowerSystemEvent) => {
      this.eventSubject.next(event);
    });

    this.startConnection();
  }

  private async startConnection(): Promise<void> {
    try {
      await this.hubConnection.start();
      console.log('SignalR connected');
    } catch (err) {
      console.error('Error establishing SignalR connection:', err);
      setTimeout(() => this.startConnection(), 5000);
    }
  }

  private updatePmuData(data: PmuData): void {
    this.pmuDataMap.update(map => {
      const newMap = new Map(map);
      newMap.set(data.pmuId, data);
      return newMap;
    });
  }

  // Observable streams
  getPmuDataStream(): Observable<PmuData> {
    return this.pmuDataSubject.asObservable();
  }

  getEventStream(): Observable<PowerSystemEvent> {
    return this.eventSubject.asObservable();
  }

  // API methods
  getConfigurations(): Observable<PmuConfiguration[]> {
    return this.http.get<PmuConfiguration[]>(`${environment.apiUrl}/api/pmu/configurations`);
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

  getAnalytics(pmuId: number, start: Date, end: Date): Observable<PmuAnalytics> {
    const params = {
      start: start.toISOString(),
      end: end.toISOString()
    };
    
    return this.http.get<PmuAnalytics>(`${environment.apiUrl}/api/pmu/analytics/${pmuId}`, { params });
  }

  getEvents(start?: Date, end?: Date, minSeverity?: string): Observable<PowerSystemEvent[]> {
    const params: any = {};
    if (start) params.start = start.toISOString();
    if (end) params.end = end.toISOString();
    if (minSeverity) params.minSeverity = minSeverity;
    
    return this.http.get<PowerSystemEvent[]>(`${environment.apiUrl}/api/pmu/events`, { params });
  }

  // SignalR methods
  subscribeToPmu(pmuId: number): Observable<void> {
    return from(this.hubConnection.invoke('SubscribeToPmu', pmuId));
  }

  unsubscribeFromPmu(pmuId: number): Observable<void> {
    return from(this.hubConnection.invoke('UnsubscribeFromPmu', pmuId));
  }

  requestAnalytics(pmuId: number, start: Date, end: Date): void {
    this.hubConnection.invoke('RequestAnalytics', pmuId, start, end);
  }
}
