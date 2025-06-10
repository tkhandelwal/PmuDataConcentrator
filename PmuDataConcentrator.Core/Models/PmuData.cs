using System;
using System.Collections.Generic;
using System.Numerics;
using PmuDataConcentrator.Core.Enums;

namespace PmuDataConcentrator.Core.Models
{
    public class PmuData
    {
        public Guid Id { get; set; }
        public int PmuId { get; set; }
        public DateTime Timestamp { get; set; }
        public long SocTimestamp { get; set; } // Second of Century
        public int FracSec { get; set; } // Fraction of Second

        // Phasor data
        public List<Phasor> Phasors { get; set; } = new();
        public double Frequency { get; set; }
        public double Rocof { get; set; } // Rate of Change of Frequency

        // Status
        public ushort Status { get; set; }
        public DataQuality Quality { get; set; }

        // Geographic info
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public string StationName { get; set; } = string.Empty;
    }

    public class Phasor
    {
        public string Name { get; set; } = string.Empty;
        public PhasorType Type { get; set; }
        public Complex Value { get; set; }
        public double Magnitude => Value.Magnitude;
        public double Angle => Value.Phase * (180 / Math.PI);
    }

    public enum PhasorType
    {
        Voltage,
        Current
    }

    public enum DataQuality
    {
        Good,
        Invalid,
        OutOfRange,
        BadReference,
        OldData
    }
}