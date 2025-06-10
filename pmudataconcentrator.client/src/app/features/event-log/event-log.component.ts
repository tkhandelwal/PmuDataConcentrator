import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-event-log',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <div class="event-log">
      <div *ngIf="events.length === 0" class="no-events">
        <mat-icon>check_circle</mat-icon>
        <p>No events to display</p>
        <small>System operating normally</small>
      </div>
      
      <div *ngIf="events.length > 0" class="event-list">
        <div *ngFor="let event of events" 
             class="event-item" 
             [class.critical]="event.severity === 2"
             [class.acknowledged]="event.isAcknowledged">
          <div class="event-icon">
            <mat-icon [style.color]="getEventColor(event)">
              {{ getEventIcon(event) }}
            </mat-icon>
          </div>
          <div class="event-content">
            <div class="event-title">{{ event.description }}</div>
            <div class="event-meta">
              <span>PMU {{ event.pmuId }}</span>
              <span>{{ formatTime(event.timestamp) }}</span>
            </div>
          </div>
          <button mat-icon-button 
                  *ngIf="!event.isAcknowledged"
                  (click)="acknowledgeEvent(event.id)"
                  matTooltip="Acknowledge">
            <mat-icon>done</mat-icon>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .event-log {
      height: 100%;
      min-height: 200px;
      max-height: 400px;
      overflow-y: auto;
    }

    .no-events {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: #666;
      text-align: center;
    }

    .no-events mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #4caf50;
      margin-bottom: 16px;
    }

    .no-events p {
      margin: 0;
      font-size: 14px;
    }

    .no-events small {
      font-size: 12px;
      color: #555;
    }

    .event-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .event-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.02);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      transition: all 0.2s ease;
      align-items: center;
    }

    .event-item:hover {
      background: rgba(255, 255, 255, 0.04);
      border-color: rgba(255, 255, 255, 0.1);
    }

    .event-item.critical {
      background: rgba(244, 67, 54, 0.05);
      border-color: rgba(244, 67, 54, 0.2);
    }

    .event-item.acknowledged {
      opacity: 0.6;
    }

    .event-icon {
      flex-shrink: 0;
    }

    .event-icon mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .event-content {
      flex: 1;
      min-width: 0;
    }

    .event-title {
      font-size: 13px;
      color: #e0e0e0;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .event-meta {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #666;
    }
  `]
})
export class EventLogComponent {
  @Input() events: any[] = [];
  @Output() eventAcknowledged = new EventEmitter<string>(); // Emit just the ID

  getEventIcon(event: any): string {
    switch (event.eventType) {
      case 0: return 'speed'; // Frequency deviation
      case 1: return 'trending_up'; // ROCOF
      case 2: return 'electrical_services'; // Voltage
      default: return 'warning';
    }
  }

  getEventColor(event: any): string {
    switch (event.severity) {
      case 0: return '#2196f3'; // Info
      case 1: return '#ff9800'; // Warning
      case 2: return '#f44336'; // Critical
      default: return '#999';
    }
  }

  formatTime(timestamp: string): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  acknowledgeEvent(eventId: string): void {
    this.eventAcknowledged.emit(eventId); // Emit just the ID
  }
}
