using System;
using System.Collections.Generic;
using System.Linq;
using System.Numerics;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using PmuDataConcentrator.Core.Interfaces;
using PmuDataConcentrator.Core.Models;
using PmuDataConcentrator.Core.Enums;

namespace PmuDataConcentrator.PMU.Emulator
{
    public class PmuEmulator : BackgroundService
    {
        private readonly ILogger<PmuEmulator> _logger;
        private readonly IPmuDataService _dataService;
        private readonly List<EmulatedPmu> _pmus;
        private readonly Random _random = new();

        public PmuEmulator(ILogger<PmuEmulator> logger, IPmuDataService dataService)
        {
            _logger = logger;
            _dataService = dataService;
            _pmus = GenerateSyntheticNetwork();
        }

        private List<EmulatedPmu> GenerateSyntheticNetwork()
        {
            // Create a synthetic IEEE 118-bus system with PMUs at key locations
            var locations = new[]
            {
                new { Id = 1, Name = "Seattle-500kV", Lat = 47.6062, Lon = -122.3321 },
                new { Id = 2, Name = "Portland-500kV", Lat = 45.5152, Lon = -122.6784 },
                new { Id = 3, Name = "San Francisco-500kV", Lat = 37.7749, Lon = -122.4194 },
                new { Id = 4, Name = "Los Angeles-500kV", Lat = 34.0522, Lon = -118.2437 },
                new { Id = 5, Name = "Phoenix-500kV", Lat = 33.4484, Lon = -112.0740 },
                new { Id = 6, Name = "Denver-345kV", Lat = 39.7392, Lon = -104.9903 },
                new { Id = 7, Name = "Chicago-765kV", Lat = 41.8781, Lon = -87.6298 },
                new { Id = 8, Name = "Detroit-345kV", Lat = 42.3314, Lon = -83.0458 },
                new { Id = 9, Name = "New York-765kV", Lat = 40.7128, Lon = -74.0060 },
                new { Id = 10, Name = "Boston-345kV", Lat = 42.3601, Lon = -71.0589 },
                new { Id = 11, Name = "Miami-500kV", Lat = 25.7617, Lon = -80.1918 },
                new { Id = 12, Name = "Houston-500kV", Lat = 29.7604, Lon = -95.3698 }
            };

            return locations.Select(loc => new EmulatedPmu
            {
                Id = loc.Id,
                Name = loc.Name,
                Latitude = loc.Lat,
                Longitude = loc.Lon,
                NominalVoltage = loc.Name.Contains("765kV") ? 765000 :
                                loc.Name.Contains("500kV") ? 500000 : 345000,
                NominalFrequency = 60.0
            }).ToList();
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("PMU Emulator started with {Count} PMUs", _pmus.Count);

            while (!stoppingToken.IsCancellationRequested)
            {
                var timestamp = DateTime.UtcNow;
                var tasks = _pmus.Select(pmu => EmulateAndSendData(pmu, timestamp)).ToArray();

                await Task.WhenAll(tasks);

                // 30 samples per second (33.33ms interval)
                await Task.Delay(33, stoppingToken);
            }
        }

        private async Task EmulateAndSendData(EmulatedPmu pmu, DateTime timestamp)
        {
            var data = new PmuData
            {
                Id = Guid.NewGuid(),
                PmuId = pmu.Id,
                Timestamp = timestamp,
                SocTimestamp = GetSocTimestamp(timestamp),
                FracSec = (int)(timestamp.Millisecond * 1000),
                StationName = pmu.Name,
                Latitude = pmu.Latitude,
                Longitude = pmu.Longitude,
                Phasors = GeneratePhasors(pmu),
                Frequency = GenerateFrequency(pmu),
                Rocof = GenerateRocof(),
                Status = 0x0000, // All good
                Quality = DataQuality.Good
            };

            await _dataService.ProcessPmuDataAsync(data);
        }

        private List<Phasor> GeneratePhasors(EmulatedPmu pmu)
        {
            var phasors = new List<Phasor>();

            // Three-phase voltages
            for (int phase = 0; phase < 3; phase++)
            {
                var baseAngle = -120 * phase * Math.PI / 180;
                var magnitude = pmu.NominalVoltage / Math.Sqrt(3) * (1 + (_random.NextDouble() - 0.5) * 0.02);
                var angle = baseAngle + (_random.NextDouble() - 0.5) * 0.05;

                phasors.Add(new Phasor
                {
                    Name = $"V{(char)('A' + phase)}",
                    Type = PhasorType.Voltage,
                    Value = Complex.FromPolarCoordinates(magnitude, angle)
                });
            }

            // Three-phase currents
            for (int phase = 0; phase < 3; phase++)
            {
                var baseAngle = -120 * phase * Math.PI / 180;
                var magnitude = 1000 * (1 + (_random.NextDouble() - 0.5) * 0.1);
                var angle = baseAngle + (_random.NextDouble() - 0.5) * 0.1;

                phasors.Add(new Phasor
                {
                    Name = $"I{(char)('A' + phase)}",
                    Type = PhasorType.Current,
                    Value = Complex.FromPolarCoordinates(magnitude, angle)
                });
            }

            return phasors;
        }

        private double GenerateFrequency(EmulatedPmu pmu)
        {
            // Simulate small frequency deviations around nominal
            return pmu.NominalFrequency + (_random.NextDouble() - 0.5) * 0.02;
        }

        private double GenerateRocof()
        {
            // Rate of change of frequency in Hz/s
            return (_random.NextDouble() - 0.5) * 0.1;
        }

        private long GetSocTimestamp(DateTime timestamp)
        {
            // Convert to Second of Century (SOC) as per C37.118
            var epoch = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            return (long)(timestamp - epoch).TotalSeconds;
        }
    }

    public class EmulatedPmu
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double NominalVoltage { get; set; }
        public double NominalFrequency { get; set; }
    }
}