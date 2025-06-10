import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, OnDestroy, ChangeDetectionStrategy, NgZone } from '@angular/core';
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
    <div class="chart-container">
      <canvas #frequencyChart></canvas>
      <div class="no-data" *ngIf="!hasData">
        <span>No frequency data available</span>
      </div>
    </div>
  `,
  styles: [`
    .chart-container {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 300px;
      padding: 10px;
    }
    
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
    
    .no-data {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #666;
      font-size: 14px;
    }
  `]
})
export class FrequencyChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('frequencyChart', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  @Input() pmuData: any[] = [];
  @Input() timeWindow: number = 300;

  private chart?: Chart;
  hasData = false;
  private initialized = false;

  constructor(private ngZone: NgZone) { }

  ngAfterViewInit(): void {
    // Initialize chart outside Angular zone for better performance
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.initializeChart();
        this.initialized = true;
        this.updateChart();
      }, 100);
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.initialized && (changes['pmuData'] || changes['timeWindow'])) {
      this.ngZone.runOutsideAngular(() => {
        this.updateChart();
      });
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private initializeChart(): void {
    if (!this.chartCanvas?.nativeElement) return;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const container = this.chartCanvas.nativeElement.parentElement;
    if (container) {
      this.chartCanvas.nativeElement.width = container.clientWidth - 20;
      this.chartCanvas.nativeElement.height = container.clientHeight - 20;
    }

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
        }, {
          label: 'Nominal (60 Hz)',
          data: [],
          borderColor: 'rgba(255, 255, 255, 0.3)',
          borderDash: [5, 5],
          borderWidth: 1,
          pointRadius: 0,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#e0e0e0',
              font: { size: 11 },
              boxWidth: 20,
              padding: 10
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
            displayColors: true,
            callbacks: {
              label: (context) => {
                if (context.datasetIndex === 0) {
                  return `Frequency: ${context.parsed.y.toFixed(3)} Hz`;
                }
                return 'Nominal: 60.000 Hz';
              }
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
              display: true
            },
            ticks: {
              color: '#e0e0e0',
              maxTicksLimit: 6,
              autoSkip: true,
              font: { size: 10 }
            },
            title: {
              display: true,
              text: 'Time',
              color: '#999',
              font: { size: 11 }
            }
          },
          y: {
            min: 59.5,
            max: 60.5,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
              display: true
            },
            ticks: {
              color: '#e0e0e0',
              callback: (value) => `${value} Hz`,
              stepSize: 0.1,
              font: { size: 10 }
            },
            title: {
              display: true,
              text: 'Frequency (Hz)',
              color: '#999',
              font: { size: 11 }
            }
          }
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  private updateChart(): void {
    if (!this.chart || !this.pmuData || this.pmuData.length === 0) {
      this.hasData = false;
      return;
    }

    const now = new Date();
    const cutoff = new Date(now.getTime() - this.timeWindow * 1000);

    // Group and average data by timestamp
    const dataMap = new Map<number, number[]>();

    this.pmuData.forEach(pmu => {
      if (!pmu.timestamp || !pmu.frequency) return;

      const timestamp = new Date(pmu.timestamp).getTime();
      if (timestamp > cutoff.getTime()) {
        const roundedTime = Math.floor(timestamp / 1000) * 1000;

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

    if (chartData.length > 0) {
      this.hasData = true;

      // Update frequency data
      this.chart.data.datasets[0].data = chartData as any;

      // Update reference line
      this.chart.data.datasets[1].data = [
        { x: chartData[0].x, y: 60 },
        { x: chartData[chartData.length - 1].x, y: 60 }
      ] as any;

      // Update chart in Angular zone to trigger change detection
      this.ngZone.run(() => {
        this.chart!.update('none');
      });
    } else {
      this.hasData = false;
    }
  }
}
