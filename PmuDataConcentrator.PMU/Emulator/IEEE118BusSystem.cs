using System;
using System.Collections.Generic;
using System.Linq;

namespace PmuDataConcentrator.PMU.Emulator
{
    public static class IEEE118BusSystem
    {
        public static List<BusData> GetBuses()
        {
            // IEEE 118-bus test system with realistic geographical mapping to US grid
            return new List<BusData>
            {
                // Pacific Northwest
                new BusData { BusNumber = 1, Name = "Grand Coulee 500kV", Lat = 47.9560, Lon = -118.9819, BaseKV = 500, Type = BusType.Generator, Zone = "WECC-NW" },
                new BusData { BusNumber = 2, Name = "Chief Joseph 500kV", Lat = 47.9951, Lon = -119.6296, BaseKV = 500, Type = BusType.Generator, Zone = "WECC-NW" },
                new BusData { BusNumber = 3, Name = "Hanford 500kV", Lat = 46.4165, Lon = -119.4888, BaseKV = 500, Type = BusType.Load, Zone = "WECC-NW" },
                new BusData { BusNumber = 4, Name = "John Day 500kV", Lat = 45.7166, Lon = -120.6930, BaseKV = 500, Type = BusType.Generator, Zone = "WECC-NW" },
                new BusData { BusNumber = 5, Name = "McNary 500kV", Lat = 45.9360, Lon = -119.2973, BaseKV = 500, Type = BusType.Load, Zone = "WECC-NW" },
                
                // California
                new BusData { BusNumber = 10, Name = "Diablo Canyon 500kV", Lat = 35.2110, Lon = -120.8560, BaseKV = 500, Type = BusType.Generator, Zone = "WECC-CA" },
                new BusData { BusNumber = 11, Name = "San Onofre 500kV", Lat = 33.3689, Lon = -117.5556, BaseKV = 500, Type = BusType.Generator, Zone = "WECC-CA" },
                new BusData { BusNumber = 12, Name = "Palo Verde 500kV", Lat = 33.3881, Lon = -112.8627, BaseKV = 500, Type = BusType.Generator, Zone = "WECC-SW" },
                new BusData { BusNumber = 13, Name = "Four Corners 500kV", Lat = 36.6868, Lon = -108.4826, BaseKV = 500, Type = BusType.Generator, Zone = "WECC-SW" },
                
                // Midwest
                new BusData { BusNumber = 20, Name = "Byron 765kV", Lat = 42.1269, Lon = -89.2552, BaseKV = 765, Type = BusType.Generator, Zone = "MISO-N" },
                new BusData { BusNumber = 21, Name = "Quad Cities 765kV", Lat = 41.7264, Lon = -90.3103, BaseKV = 765, Type = BusType.Generator, Zone = "MISO-N" },
                new BusData { BusNumber = 22, Name = "LaSalle 765kV", Lat = 41.2434, Lon = -88.6709, BaseKV = 765, Type = BusType.Generator, Zone = "MISO-N" },
                
                // Texas
                new BusData { BusNumber = 30, Name = "Comanche Peak 345kV", Lat = 32.2987, Lon = -97.7853, BaseKV = 345, Type = BusType.Generator, Zone = "ERCOT-N" },
                new BusData { BusNumber = 31, Name = "South Texas 345kV", Lat = 28.7954, Lon = -96.0413, BaseKV = 345, Type = BusType.Generator, Zone = "ERCOT-S" },
                
                // East Coast
                new BusData { BusNumber = 40, Name = "Susquehanna 500kV", Lat = 41.0897, Lon = -76.1474, BaseKV = 500, Type = BusType.Generator, Zone = "PJM-W" },
                new BusData { BusNumber = 41, Name = "Peach Bottom 500kV", Lat = 39.7589, Lon = -76.2692, BaseKV = 500, Type = BusType.Generator, Zone = "PJM-E" },
                new BusData { BusNumber = 42, Name = "Salem 500kV", Lat = 39.4627, Lon = -75.5358, BaseKV = 500, Type = BusType.Generator, Zone = "PJM-E" },
                
                // Add more buses to reach 118...
                // This is a subset - you would add all 118 buses with realistic locations
            };
        }

        public static List<TransmissionLine> GetTransmissionLines()
        {
            return new List<TransmissionLine>
            {
                // Major 500kV interconnections
                new TransmissionLine { FromBus = 1, ToBus = 2, R = 0.0001, X = 0.001, B = 0.1, RateA = 2000, Length = 50 },
                new TransmissionLine { FromBus = 2, ToBus = 3, R = 0.0002, X = 0.002, B = 0.2, RateA = 2000, Length = 100 },
                new TransmissionLine { FromBus = 3, ToBus = 4, R = 0.0003, X = 0.003, B = 0.3, RateA = 1500, Length = 150 },
                
                // 765kV ties
                new TransmissionLine { FromBus = 20, ToBus = 21, R = 0.00005, X = 0.0005, B = 0.05, RateA = 3000, Length = 80 },
                new TransmissionLine { FromBus = 21, ToBus = 22, R = 0.00006, X = 0.0006, B = 0.06, RateA = 3000, Length = 90 },
                
                // Inter-area ties
                new TransmissionLine { FromBus = 4, ToBus = 10, R = 0.0004, X = 0.004, B = 0.4, RateA = 1000, Length = 500 },
                new TransmissionLine { FromBus = 13, ToBus = 30, R = 0.0005, X = 0.005, B = 0.5, RateA = 800, Length = 600 },
                
                // Add more lines...
            };
        }
    }

    public class BusData
    {
        public int BusNumber { get; set; }
        public string Name { get; set; } = string.Empty;
        public double Lat { get; set; }
        public double Lon { get; set; }
        public double BaseKV { get; set; }
        public BusType Type { get; set; }
        public string Zone { get; set; } = string.Empty;
        public double LoadMW { get; set; }
        public double LoadMVAR { get; set; }
        public double GenMW { get; set; }
        public double GenMVAR { get; set; }
    }

    public class TransmissionLine
    {
        public int FromBus { get; set; }
        public int ToBus { get; set; }
        public double R { get; set; } // Resistance (pu)
        public double X { get; set; } // Reactance (pu)
        public double B { get; set; } // Susceptance (pu)
        public double RateA { get; set; } // MVA rating
        public double Length { get; set; } // km
    }

    public enum BusType
    {
        Load,
        Generator,
        Slack,
        Interconnection
    }
}