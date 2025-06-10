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

  private updatePmuData(data: PmuData): void {
    this.pmuDataMap.update(map => {
      const newMap = new Map(map);
      newMap.set(data.pmuId, data);
      return newMap;
    });
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
