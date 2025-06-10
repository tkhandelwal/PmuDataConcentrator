import { Component, Input, OnInit, OnChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { enUS } from 'date-fns/locale';

Chart.register(...registerables);

@Component({
  selector: 'app-frequency-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [`
    .chart-container {
      position: relative;
      height: 100%;
      width: 100%;
      min-height: 300px;
    }
  `]
})
export class FrequencyChartComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() pmuData: any[] = [];
  @Input() timeWindow: number = 300; // seconds
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  private chart?: Chart;
  private dataBuffer = new Map<number, { times: Date[], values: number[] }>();
  private maxDataPoints = 300;

  ngOnInit(): void {
    // Initialize
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initializeChart(), 100);
  }

  ngOnChanges(): void {
    if (this.chart && this.pmuData.length > 0) {
      this.updateChart();
    }
  }

  private initializeChart(): void {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'line' as ChartType,
      data: {
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 0
        },
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          title: {
            display: false
          },
          legend: {
            display: true,
            position: 'top',
            labels: {
              color: '#999',
              padding: 15,
              usePointStyle: true,
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
            cornerRadius: 8,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: (context: any) => {
                return `${context.dataset.label}: ${context.parsed.y.toFixed(3)} Hz`;
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
              },
              tooltipFormat: 'PPpp'
            },
            adapters: {
              date: {
                locale: enUS
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              lineWidth: 1
            },
            ticks: {
              color: '#666',
              maxRotation: 0,
              font: {
                size: 11
              }
            }
          },
          y: {
            min: 59.9,
            max: 60.1,
            grid: {
              color: 'rgba(255, 255, 255, 0.05)',
              lineWidth: 1
            },
            ticks: {
              color: '#666',
              font: {
                size: 11
              },
              callback: (value: any) => `${value} Hz`
            }
          }
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  private updateChart(): void {
    if (!this.chart) return;

    // Update data buffers
    this.pmuData.forEach(pmu => {
      if (!this.dataBuffer.has(pmu.pmuId)) {
        this.dataBuffer.set(pmu.pmuId, { times: [], values: [] });
      }

      const buffer = this.dataBuffer.get(pmu.pmuId)!;
      const timestamp = new Date(pmu.timestamp);
      
      // Ensure valid date
      if (!isNaN(timestamp.getTime())) {
        buffer.times.push(timestamp);
        buffer.values.push(pmu.frequency);

        // Keep only recent data
        if (buffer.times.length > this.maxDataPoints) {
          buffer.times.shift();
          buffer.values.shift();
        }
      }
    });

    // Update chart datasets - show only average for cleaner view
    const avgData = this.calculateAverageFrequency();
    
    if (avgData.length > 0) {
      this.chart.data.datasets = [{
        label: 'System Average',
        data: avgData,
        borderColor: '#00d4ff',
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
        fill: true
      }];

      // Add reference lines as datasets
      const timeRange = avgData.map(d => d.x);
      this.chart.data.datasets.push({
        label: 'Nominal (60 Hz)',
        data: timeRange.map(time => ({ x: time, y: 60 })),
        borderColor: 'rgba(0, 212, 255, 0.3)',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false
      });

      this.chart.update('none');
    }
  }

  private calculateAverageFrequency(): any[] {
    const timeMap = new Map<number, number[]>();
    
    this.dataBuffer.forEach(buffer => {
      buffer.times.forEach((time, i) => {
        const timestamp = time.getTime();
        if (!isNaN(timestamp) && isFinite(timestamp)) {
          if (!timeMap.has(timestamp)) {
            timeMap.set(timestamp, []);
          }
          timeMap.get(timestamp)!.push(buffer.values[i]);
        }
      });
    });

    return Array.from(timeMap.entries())
      .map(([timestamp, values]) => ({
        x: new Date(timestamp),
        y: values.reduce((a, b) => a + b, 0) / values.length
      }))
      .filter(point => !isNaN(point.x.getTime()) && !isNaN(point.y))
      .sort((a, b) => a.x.getTime() - b.x.getTime());
  }
}
