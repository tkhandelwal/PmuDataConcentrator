// app/core/services/data-buffer.service.ts
import { Injectable } from '@angular/core';
import { Subject, Observable, bufferTime, filter } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DataBufferService {
  private updateSubject = new Subject<any>();

  getBufferedUpdates(intervalMs: number = 100): Observable<any[]> {
    return this.updateSubject.pipe(
      bufferTime(intervalMs),
      filter(buffer => buffer.length > 0)
    );
  }

  addUpdate(data: any): void {
    this.updateSubject.next(data);
  }
}
