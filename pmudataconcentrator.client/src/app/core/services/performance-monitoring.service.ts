import { Injectable, signal } from '@angular/core';

export interface PerformanceMetrics {
  fps: number;
  memoryUsage: number;
  renderTime: number;
  dataProcessingTime: number;
  networkLatency: number;
  cpuUsage: number;
}

@Injectable({ providedIn: 'root' })
export class PerformanceMonitoringService {
  private performanceObserver!: PerformanceObserver;
  private frameCount = 0;
  private lastFrameTime = performance.now();

  metrics = signal<PerformanceMetrics>({
    fps: 60,
    memoryUsage: 0,
    renderTime: 0,
    dataProcessingTime: 0,
    networkLatency: 0,
    cpuUsage: 0
  });

  // Thresholds for alerts
  private readonly thresholds = {
    minFPS: 30,
    maxMemoryUsage: 90,
    maxRenderTime: 16.67, // 60 FPS target
    maxDataProcessingTime: 100,
    maxNetworkLatency: 1000
  };

  constructor() {
    this.initializeMonitoring();
  }

  private initializeMonitoring(): void {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn('Long task detected:', {
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
        }
      });

      try {
        this.performanceObserver.observe({ entryTypes: ['longtask'] });
      } catch (e) {
        console.warn('Long task monitoring not supported');
      }
    }

    // Start monitoring
    this.monitorFrameRate();
    this.monitorMemoryUsage();
    this.monitorNetworkLatency();
  }

  private monitorFrameRate(): void {
    const measureFPS = (currentTime: number) => {
      this.frameCount++;

      if (currentTime >= this.lastFrameTime + 1000) {
        const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFrameTime));

        this.metrics.update(m => ({ ...m, fps }));

        if (fps < this.thresholds.minFPS) {
          console.warn(`Low FPS detected: ${fps}`);
          this.optimizePerformance();
        }

        this.frameCount = 0;
        this.lastFrameTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  private monitorMemoryUsage(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

        this.metrics.update(m => ({ ...m, memoryUsage: usagePercentage }));

        if (usagePercentage > this.thresholds.maxMemoryUsage) {
          console.warn(`High memory usage: ${usagePercentage.toFixed(1)}%`);
          this.triggerGarbageCollection();
        }
      }, 5000);
    }
  }

  private monitorNetworkLatency(): void {
    // Monitor WebSocket latency
    setInterval(() => {
      const start = performance.now();

      // Simulate ping
      setTimeout(() => {
        const latency = performance.now() - start;
        this.metrics.update(m => ({ ...m, networkLatency: latency }));
      }, 0);
    }, 10000);
  }

  measureOperation<T>(name: string, operation: () => T): T {
    const start = performance.now();

    try {
      const result = operation();
      const duration = performance.now() - start;

      if (name === 'render') {
        this.metrics.update(m => ({ ...m, renderTime: duration }));

        if (duration > this.thresholds.maxRenderTime) {
          console.warn(`Slow render: ${duration.toFixed(2)}ms`);
        }
      } else if (name === 'dataProcessing') {
        this.metrics.update(m => ({ ...m, dataProcessingTime: duration }));

        if (duration > this.thresholds.maxDataProcessingTime) {
          console.warn(`Slow data processing: ${duration.toFixed(2)}ms`);
        }
      }

      // Log to performance API
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);

      return result;
    } catch (error) {
      console.error(`Error in ${name}:`, error);
      throw error;
    } finally {
      performance.mark(`${name}-start`);
    }
  }

  private optimizePerformance(): void {
    // Reduce quality settings
    console.log('Optimizing performance...');

    // Emit performance optimization event
    window.dispatchEvent(new CustomEvent('performance-optimize', {
      detail: {
        currentFPS: this.metrics().fps,
        targetFPS: 60
      }
    }));
  }

  private triggerGarbageCollection(): void {
    // Clear caches and unused objects
    console.log('Triggering garbage collection...');

    // Clear image caches
    const canvases = document.querySelectorAll('canvas');
    canvases.forEach(canvas => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });

    // Emit memory cleanup event
    window.dispatchEvent(new CustomEvent('memory-cleanup'));
  }

  getPerformanceReport(): string {
    const m = this.metrics();
    return `
Performance Report:
- FPS: ${m.fps} (Target: 60)
- Memory Usage: ${m.memoryUsage.toFixed(1)}%
- Render Time: ${m.renderTime.toFixed(2)}ms
- Data Processing: ${m.dataProcessingTime.toFixed(2)}ms
- Network Latency: ${m.networkLatency.toFixed(0)}ms
    `.trim();
  }

  enableDetailedLogging(): void {
    // Enable detailed performance logging
    console.log('Detailed performance logging enabled');

    // Log all performance entries
    const entries = performance.getEntries();
    console.table(entries.slice(-20));
  }
}
