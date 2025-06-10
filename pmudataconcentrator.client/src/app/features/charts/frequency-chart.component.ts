import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';

Chart.register(...registerables);

@Component({
  selector: 'app-frequency-chart',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart-wrapper">
      <canvas #frequencyChart></canvas>
      <div class="chart-loading" *ngIf="!chartInitialized">
        <span>Loading chart...</span>
      </div>
    </div>
  `,
  styles: [`
    .chart-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 200px;
    }
    
    canvas {
      max-width: 100%;
      max-height: 100%;
    }
    
    .chart-loading {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.5);
      color: #999;
    }
  `]
})
export class FrequencyChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('frequencyChart', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  @Input() pmuData: any[] = [];
  @Input() timeWindow: number = 300;

  private chart?: Chart;
  chartInitialized = false;
  private resizeObserver?: ResizeObserver;

  ngAfterViewInit(): void {
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      this.initializeChart();
      this.setupResizeObserver();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.chart && this.chartInitialized && (changes['pmuData'] || changes['timeWindow'])) {
      this.updateChart();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.destroy();
  }

  private setupResizeObserver(): void {
    if (this.chartCanvas?.nativeElement) {
      this.resizeObserver = new ResizeObserver(() => {
        this.chart?.resize();
      });
      this.resizeObserver.observe(this.chartCanvas.nativeElement);
    }
  }

  private initializeChart(): void {
    if (!this.chartCanvas?.nativeElement) return;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        datasets: [{
          label: 'System Frequency',
          data: [],
          borderColor: '#00d4ff',
          backgroundColor: 'rgba(0, 212, 255, 0.1)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.2,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0 // Disable animations for real-time data
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,  // Change to true
            labels: {
              color: '#e0e0e0',  // Make sure text is visible
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            titleColor: '#00d4ff',
            bodyColor: '#e0e0e0',
            borderColor: '#333',
            borderWidth: 1,
            callbacks: {
              label: (context) => `${context.parsed.y.toFixed(3)} Hz`
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              displayFormats: {
                second: 'HH:mm:ss',
                minute: 'HH:mm'
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
            ticks: {
              color: '#e0e0e0',
              maxTicksLimit: 8,
              autoSkip: true
            }
          },
          y: {
            min: 59.5,
            max: 60.5,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            },
            ticks: {
              color: '#666',
              callback: (value) => `${value} Hz`,
              stepSize: 0.1
            }
          }
        }
      }
    };

    this.chart = new Chart(ctx, config);
    this.chartInitialized = true;
    this.updateChart();
  }

  private updateChart(): void {
    if (!this.chart || !this.chartInitialized || this.pmuData.length === 0) return;

    const now = new Date();
    const cutoff = new Date(now.getTime() - this.timeWindow * 1000);

    // Group and average data by timestamp
    const dataMap = new Map<number, number[]>();

    this.pmuData.forEach(pmu => {
      if (!pmu.timestamp || !pmu.frequency) return;

      const timestamp = new Date(pmu.timestamp).getTime();
      if (timestamp > cutoff.getTime()) {
        const roundedTime = Math.floor(timestamp / 1000) * 1000; // Round to nearest second

        if (!dataMap.has(roundedTime)) {
          dataMap.set(roundedTime, []);
        }
        dataMap.get(roundedTime)?.push(pmu.frequency);
      }
    });

    // Calculate averages and create chart data
    const chartData = Array.from(dataMap.entries())
      .map(([time, frequencies]) => ({
        x: time,
        y: frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length
      }))
      .sort((a, b) => a.x - b.x);

    // Update chart
    this.chart.data.datasets[0].data = chartData as any;

    // Add reference line at 60Hz
    if (!this.chart.data.datasets[1] && chartData.length > 0) {
      this.chart.data.datasets.push({
        label: 'Nominal',
        data: [
          { x: chartData[0].x, y: 60 },
          { x: chartData[chartData.length - 1].x, y: 60 }
        ] as any,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        borderDash: [5, 5],
        borderWidth: 1,
        pointRadius: 0,
        fill: false
      });
    }

    this.chart.update('none');
  }
}
