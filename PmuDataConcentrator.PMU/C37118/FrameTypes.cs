using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.AspNetCore.SignalR;
using PmuDataConcentrator.Core.Models;
using PmuDataConcentrator.Core.Entities;
using PmuDataConcentrator.Core.Enums;
using PmuDataConcentrator.Core.Interfaces;

namespace PmuDataConcentrator.PMU.C37118
{
    public class PmuFrame
    {
        public ushort Sync { get; set; }
        public ushort FrameSize { get; set; }
        public ushort IdCode { get; set; }
        public uint SocTimestamp { get; set; }
        public uint FracSec { get; set; }
        public FrameType FrameType => (FrameType)((Sync >> 4) & 0x07);
    }

    public class PmuDataFrame : PmuFrame
    {
        public PmuDataFrame() { }

        public PmuDataFrame(PmuFrame baseFrame)
        {
            Sync = baseFrame.Sync;
            FrameSize = baseFrame.FrameSize;
            IdCode = baseFrame.IdCode;
            SocTimestamp = baseFrame.SocTimestamp;
            FracSec = baseFrame.FracSec;
        }

        public ushort Status { get; set; }
        public List<Phasor> Phasors { get; set; } = new();
        public float Frequency { get; set; }
        public float Rocof { get; set; }
        public List<float> Analogs { get; set; } = new();
        public List<ushort> Digitals { get; set; } = new();
    }

    public class ConfigurationFrame : PmuFrame
    {
        public string StationName { get; set; } = string.Empty;
        public ushort DataRate { get; set; }
        public List<PhasorDefinition> Phasors { get; set; } = new();
        public List<AnalogDefinition> Analogs { get; set; } = new();
        public List<DigitalDefinition> Digitals { get; set; } = new();
    }

    public class PhasorDefinition
    {
        public string Name { get; set; } = string.Empty;
        public PhasorType Type { get; set; }
        public DataFormat Format { get; set; }
        public float ScaleFactor { get; set; }
    }

    public class AnalogDefinition
    {
        public string Name { get; set; } = string.Empty;
        public int AnalogType { get; set; }
        public float ScaleFactor { get; set; }
    }

    public class DigitalDefinition
    {
        public string[] ChannelNames { get; set; } = new string[16];
        public ushort NormalStatus { get; set; }
        public ushort ValidBits { get; set; }
    }
}