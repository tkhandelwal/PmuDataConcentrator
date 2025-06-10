import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { Observable, Subject, from } from 'rxjs';
import { PmuData, PmuConfiguration, PowerSystemEvent } from '../models/pmu-data.model';

// Fix the environment import path
const environment = {
  production: false,
  apiUrl: 'http://localhost:5242'
};

@Injectable({
  providedIn: 'root'
})
export class PmuDataService {
  private hubConnection!: HubConnection;
  private pmuDataSubject = new Subject<PmuData>();
  private eventSubject = new Subject<PowerSystemEvent>();
  
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

  private updatePmuData(data: any): void {
  // Normalize the data to ensure consistent property names
  const normalizedData = this.normalizePmuData(data);
  
  this.pmuDataMap.update(map => {
    const newMap = new Map(map);
    newMap.set(normalizedData.pmuId, normalizedData);
    return newMap;
  });
}

private normalizePmuData(data: any): PmuData {
  return {
    id: data.id ?? data.Id,
    pmuId: data.pmuId ?? data.PmuId,
    timestamp: data.timestamp ?? data.Timestamp,
    socTimestamp: data.socTimestamp ?? data.SocTimestamp,
    fracSec: data.fracSec ?? data.FracSec,
    phasors: data.phasors ?? data.Phasors ?? [],
    frequency: data.frequency ?? data.Frequency ?? 60.0,
    rocof: data.rocof ?? data.Rocof ?? 0,
    status: data.status ?? data.Status ?? 0,
    quality: data.quality ?? data.Quality ?? 0,
    latitude: data.latitude ?? data.Latitude ?? 0,
    longitude: data.longitude ?? data.Longitude ?? 0,
    stationName: data.stationName ?? data.StationName ?? ''
  };
}

  getPmuDataStream(): Observable<PmuData> {
    return this.pmuDataSubject.asObservable();
  }

  getEventStream(): Observable<PowerSystemEvent> {
    return this.eventSubject.asObservable();
  }

  getLatestData(): Observable<PmuData[]> {
    return this.http.get<PmuData[]>(`${environment.apiUrl}/api/pmu/data/latest`);
  }

  getConfigurations(): Observable<PmuConfiguration[]> {
    return this.http.get<PmuConfiguration[]>(`${environment.apiUrl}/api/pmu/configurations`);
  }
}
