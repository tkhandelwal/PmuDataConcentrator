// pmudataconcentrator.client/src/app/features/charts/frequency-chart.component.ts
import { Component, Input, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-frequency-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container">
      <canvas #frequencyChart></canvas>
    </div>
  `,
  styles: [`
    .chart-container {
      width: 100%;
      height: 100%;
      min-height: 200px;
      position: relative;
    }
  `]
})
export class FrequencyChartComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('frequencyChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  @Input() pmuData: any[] = [];
  @Input() timeWindow: number = 300; // seconds
  
  private chart?: Chart;
  
  ngOnInit(): void {
    // Component initialization
  }
  
  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initializeChart();
    }, 100);
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (this.chart && (changes['pmuData'] || changes['timeWindow'])) {
      this.updateChart();
    }
  }
  
  ngOnDestroy(): void {
    this.chart?.destroy();
  }
  
  private initializeChart(): void {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;
    
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        datasets: []
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
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: 'rgba(26, 26, 26, 0.95)',
            titleColor: '#00d4ff',
            callbacks: {
              label: (context: any) => {
                return `${context.parsed.y.toFixed(3)} Hz`;
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
              color: 'rgba(255, 255, 255, 0.05)' 
            },
            ticks: { 
              color: '#666',
              maxTicksLimit: 8
            }
          },
          y: {
            min: 59.5,
            max: 60.5,
            grid: { 
              color: 'rgba(255, 255, 255, 0.05)' 
            },
            ticks: {
              color: '#666',
              callback: (value: any) => `${value} Hz`
            }
          }
        }
      }
    };
    
    this.chart = new Chart(ctx, config);
    this.updateChart();
  }
  
  // Around line 153, change the updateChart method:
private updateChart(): void {
  if (!this.chart || this.pmuData.length === 0) return;
  
  // Calculate system average frequency
  const now = new Date();
  const cutoff = new Date(now.getTime() - this.timeWindow * 1000);
  
  // Group data by timestamp
  const dataByTime = new Map<number, number[]>();
  
  this.pmuData.forEach(pmu => {
    const timestamp = new Date(pmu.timestamp).getTime();
    if (timestamp > cutoff.getTime()) {
      if (!dataByTime.has(timestamp)) {
        dataByTime.set(timestamp, []);
      }
      dataByTime.get(timestamp)?.push(pmu.frequency || 60.0);
    }
  });
  
  // Calculate averages - Fix: convert to proper format
  const chartData = Array.from(dataByTime.entries())
    .map(([time, frequencies]) => ({
      x: time, // Use timestamp as number for time scale
      y: frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length
    }))
    .sort((a, b) => a.x - b.x);
  
  // Update chart with proper type
  this.chart.data.datasets = [{
    label: 'System Frequency',
    data: chartData as any, // Type assertion for Chart.js compatibility
    borderColor: '#00d4ff',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderWidth: 2,
    pointRadius: 0,
    tension: 0.2,
    fill: true
  }];
  
  this.chart.update('none');
}
}
