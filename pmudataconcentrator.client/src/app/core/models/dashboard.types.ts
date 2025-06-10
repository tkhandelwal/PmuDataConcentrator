export interface MapLayers {
  transmission: boolean;
  zones: boolean;
  weather: boolean;
}

export interface SystemMetrics {
  avgFrequency: number;
  avgRocof: number;
  maxFrequencyDev: number;
  minFrequency: number;
  maxFrequency: number;
  voltageStability: number;
  phaseAngleSpread: number;
  dataLatency: number;
}

export interface AlertThresholds {
  frequencyMin: number;
  frequencyMax: number;
  rocofMax: number;
  voltageMin: number;
  voltageMax: number;
  phaseAngleMax: number;
}

export interface Alert {
  id: string;
  message: string;
  severity: string;
}
