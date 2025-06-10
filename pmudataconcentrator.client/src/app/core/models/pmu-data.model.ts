export interface PmuData {
  id: string;
  pmuId: number;
  timestamp: Date;
  socTimestamp: number;
  fracSec: number;
  phasors: Phasor[];
  frequency: number;
  rocof: number;
  status: number;
  quality: DataQuality;
  latitude: number;
  longitude: number;
  stationName: string;
}

export interface Phasor {
  name: string;
  type: PhasorType;
  value: { real: number; imaginary: number };
  magnitude: number;
  angle: number;
}

export enum PhasorType {
  Voltage = 0,
  Current = 1
}

export enum DataQuality {
  Good = 0,
  Invalid = 1,
  OutOfRange = 2,
  BadReference = 3,
  OldData = 4
}

export interface PmuConfiguration {
  id: number;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  nominalVoltage: number;
  nominalFrequency: number;
  isActive: boolean;
}

export interface PowerSystemEvent {
  id: string;
  timestamp: Date;
  pmuId?: number;
  eventType: EventType;
  severity: EventSeverity;
  description: string;
  isAcknowledged: boolean;
}

export enum EventType {
  FrequencyDeviation = 0,
  RapidFrequencyChange = 1,
  VoltageViolation = 2
}

export enum EventSeverity {
  Information = 0,
  Warning = 1,
  Critical = 2,
  Emergency = 3
}
