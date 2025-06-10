import { Component, Input, OnInit, OnChanges, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { PmuData } from '../../core/models';

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
    }
  `]
})
export class FrequencyChartComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() pmuData: PmuData[] = [];
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  private chart?: Chart;
  private dataBuffer = new Map<number, { times: Date[], values: number[] }>();
  private maxDataPoints = 300; // 10 seconds at 30 samples/sec

  ngOnInit(): void {
    // Initialize data buffers for each PMU
  }

  ngAfterViewInit(): void {
    this.initializeChart();
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
            position: 'top',
            labels: {
              color: '#e0e0e0',
              usePointStyle: true,
              padding: 15
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(26, 26, 26, 0.9)',
            titleColor: '#00d4ff',
            bodyColor: '#e0e0e0',
            borderColor: '#333',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              displayFormats: {
                second: 'HH:mm:ss'
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
              lineWidth: 0.5
            },
            ticks: {
              color: '#999',
              maxRotation: 0
            }
          },
          y: {
            min: 59.5,
            max: 60.5,
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
              lineWidth: 0.5
            },
            ticks: {
              color: '#999',
              callback: (value) => `${value} Hz`
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
      buffer.times.push(new Date(pmu.timestamp));
      buffer.values.push(pmu.frequency);

      // Keep only recent data
      if (buffer.times.length > this.maxDataPoints) {
        buffer.times.shift();
        buffer.values.shift();
      }
    });

    // Update chart datasets
    const datasets = Array.from(this.dataBuffer.entries()).map(([pmuId, buffer]) => {
      const pmu = this.pmuData.find(p => p.pmuId === pmuId);
      const color = this.getColorForPmu(pmuId);
      
      return {
        label: pmu?.stationName || `PMU ${pmuId}`,
        data: buffer.times.map((time, i) => ({ x: time, y: buffer.values[i] })),
        borderColor: color,
        backgroundColor: color + '20',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
        fill: false
      };
    });

    this.chart.data.datasets = datasets;
    this.chart.update('none');
  }

  private getColorForPmu(pmuId: number): string {
    const colors = [
      '#00d4ff', '#00ff88', '#ff6b6b', '#feca57', '#48dbfb',
      '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3', '#ff6348'
    ];
    return colors[pmuId % colors.length];
  }
}
