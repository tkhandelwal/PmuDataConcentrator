using PmuDataConcentrator.Core.Models;
using System;

namespace PmuDataConcentrator.Core.Entities
{
    public class PmuDataEntity
    {
        public DateTime Timestamp { get; set; }
        public int PmuId { get; set; }
        public long SocTimestamp { get; set; }
        public int FracSec { get; set; }
        public string PhasorsJson { get; set; } = string.Empty; // JSON storage for phasors
        public double Frequency { get; set; }
        public double Rocof { get; set; }
        public ushort Status { get; set; }
        public DataQuality Quality { get; set; }
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string StationName { get; set; } = string.Empty;
    }

    public class PmuConfiguration
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double NominalVoltage { get; set; }
        public double NominalFrequency { get; set; }
        public int NumberOfPhasors { get; set; }
        public string PhasorDefinitionsJson { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public bool IsActive { get; set; }
    }

    public class PowerSystemEvent
    {
        public Guid Id { get; set; }
        public DateTime Timestamp { get; set; }
        public int? PmuId { get; set; }
        public EventType EventType { get; set; }
        public EventSeverity Severity { get; set; }
        public string Description { get; set; } = string.Empty;
        public string Data { get; set; } = string.Empty; // JSON data
        public bool IsAcknowledged { get; set; }
        public DateTime? AcknowledgedAt { get; set; }
        public string? AcknowledgedBy { get; set; }
    }
}