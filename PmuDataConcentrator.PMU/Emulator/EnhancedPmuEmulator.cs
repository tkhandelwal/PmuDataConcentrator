using System;
using System.Collections.Generic;
using System.Linq;
using System.Numerics;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using PmuDataConcentrator.Core.Interfaces;
using PmuDataConcentrator.Core.Models;
using PmuDataConcentrator.Core.Enums;

namespace PmuDataConcentrator.PMU.Emulator
{
    public class EnhancedPmuEmulator : BackgroundService
    {
        private readonly ILogger<EnhancedPmuEmulator> _logger;
        private readonly IPmuDataService _dataService;
        private readonly IConfiguration _configuration;
        private readonly List<VirtualPmu> _pmus;
        private readonly PowerSystemSimulator _simulator;
        private readonly Random _random = new();

        // Configuration
        private readonly int _sampleRate;
        private readonly bool _simulateDisturbances;
        private readonly double _noiseLevel;

        public EnhancedPmuEmulator(
            ILogger<EnhancedPmuEmulator> logger,
            IPmuDataService dataService,
            IConfiguration configuration)
        {
            _logger = logger;
            _dataService = dataService;
            _configuration = configuration;

            // Load configuration - use GetSection for better null handling
            var emulatorConfig = configuration.GetSection("PmuEmulator");
            _sampleRate = emulatorConfig.GetValue<int>("SampleRate", 30);
            _simulateDisturbances = emulatorConfig.GetValue<bool>("SimulateDisturbances", true);
            _noiseLevel = emulatorConfig.GetValue<double>("NoiseLevel", 0.01);

            // Initialize power system
            var buses = IEEE118BusSystem.GetBuses();
            var lines = IEEE118BusSystem.GetTransmissionLines();

            // Create PMUs at strategic locations (every 3rd bus for 39 PMUs)
            _pmus = buses.Where((bus, index) => index % 3 == 0)
                        .Select((bus, index) => new VirtualPmu
                        {
                            Id = index + 1,
                            BusNumber = bus.BusNumber,
                            Name = bus.Name,
                            Latitude = bus.Lat,
                            Longitude = bus.Lon,
                            NominalVoltage = bus.BaseKV * 1000,
                            NominalFrequency = 60.0,
                            PhasorFormat = DataFormat.Polar,
                            ConfiguredChannels = CreateChannelConfig(bus)
                        }).ToList();

            _simulator = new PowerSystemSimulator(buses, lines, _pmus);
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Enhanced PMU Emulator started with {Count} PMUs at {Rate} Hz",
                _pmus.Count, _sampleRate);

            var sampleInterval = TimeSpan.FromMilliseconds(1000.0 / _sampleRate);
            var nextSample = DateTime.UtcNow;

            while (!stoppingToken.IsCancellationRequested)
            {
                var startTime = DateTime.UtcNow;

                // Simulate power system state
                _simulator.Step(1.0 / _sampleRate);

                // Apply disturbances if configured
                if (_simulateDisturbances && _random.NextDouble() < 0.001) // 0.1% chance per sample
                {
                    ApplyDisturbance();
                }

                // Generate and send PMU data
                var tasks = _pmus.Select(pmu => GenerateAndSendData(pmu, startTime)).ToArray();
                await Task.WhenAll(tasks);

                // Maintain precise sampling rate
                nextSample = nextSample.Add(sampleInterval);
                var delay = nextSample - DateTime.UtcNow;
                if (delay > TimeSpan.Zero)
                {
                    await Task.Delay(delay, stoppingToken);
                }
            }
        }

        private async Task GenerateAndSendData(VirtualPmu pmu, DateTime timestamp)
        {
            var state = _simulator.GetBusState(pmu.BusNumber);

            var data = new PmuData
            {
                Id = Guid.NewGuid(),
                PmuId = pmu.Id,
                Timestamp = timestamp,
                SocTimestamp = GetSocTimestamp(timestamp),
                FracSec = GetFracSec(timestamp),
                StationName = pmu.Name,
                Latitude = pmu.Latitude,
                Longitude = pmu.Longitude,
                Phasors = GeneratePhasors(pmu, state),
                Frequency = state.Frequency + AddNoise(_noiseLevel * 0.01),
                Rocof = state.Rocof + AddNoise(_noiseLevel * 0.1),
                Status = GenerateStatus(state),
                Quality = EvaluateQuality(state)
            };

            await _dataService.ProcessPmuDataAsync(data);
        }

        private List<Phasor> GeneratePhasors(VirtualPmu pmu, PowerSystemState state)
        {
            var phasors = new List<Phasor>();

            // Three-phase voltages
            for (int phase = 0; phase < 3; phase++)
            {
                var phaseShift = -120 * phase * Math.PI / 180;
                var magnitude = state.VoltageMagnitude * pmu.NominalVoltage / Math.Sqrt(3);
                magnitude += AddNoise(_noiseLevel * magnitude * 0.01);

                var angle = state.VoltageAngle + phaseShift + AddNoise(_noiseLevel * 0.01);

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
                var phaseShift = -120 * phase * Math.PI / 180;
                var magnitude = state.CurrentMagnitude + AddNoise(_noiseLevel * state.CurrentMagnitude * 0.02);
                var angle = state.CurrentAngle + phaseShift + AddNoise(_noiseLevel * 0.02);

                phasors.Add(new Phasor
                {
                    Name = $"I{(char)('A' + phase)}",
                    Type = PhasorType.Current,
                    Value = Complex.FromPolarCoordinates(magnitude, angle)
                });
            }

            // Positive sequence components
            phasors.Add(new Phasor
            {
                Name = "V1",
                Type = PhasorType.Voltage,
                Value = Complex.FromPolarCoordinates(
                    state.VoltageMagnitude * pmu.NominalVoltage,
                    state.VoltageAngle)
            });

            return phasors;
        }

        private ushort GenerateStatus(PowerSystemState state)
        {
            ushort status = 0x0000;

            // Bit 0-1: Data error (00 = good)
            if (state.DataError) status |= 0x0001;

            // Bit 2: PMU sync (0 = sync to GPS)
            if (!state.GpsSync) status |= 0x0004;

            // Bit 3: Data sorting (0 = by timestamp)
            // Bit 4: PMU trigger (0 = no trigger)
            if (state.Triggered) status |= 0x0010;

            // Bit 5: Configuration change
            if (state.ConfigChanged) status |= 0x0020;

            // Bit 14-15: Time quality
            status |= (ushort)((state.TimeQuality & 0x03) << 14);

            return status;
        }

        private DataQuality EvaluateQuality(PowerSystemState state)
        {
            if (!state.GpsSync || state.DataError)
                return DataQuality.Invalid;

            if (Math.Abs(state.Frequency - 60.0) > 5.0)
                return DataQuality.OutOfRange;

            if (state.TimeQuality > 2)
                return DataQuality.BadReference;

            if ((DateTime.UtcNow - state.LastUpdate).TotalSeconds > 1.0)
                return DataQuality.OldData;

            return DataQuality.Good;
        }

        private void ApplyDisturbance()
        {
            var disturbanceType = _random.Next(5);

            switch (disturbanceType)
            {
                case 0: // Generation trip
                    _simulator.TripGenerator(_random.Next(1, 50));
                    _logger.LogWarning("Simulated generator trip");
                    break;

                case 1: // Line outage
                    _simulator.TripLine(_random.Next(1, 100));
                    _logger.LogWarning("Simulated line outage");
                    break;

                case 2: // Load change
                    _simulator.ChangeLoad(_random.Next(1, 118), (_random.NextDouble() - 0.5) * 100);
                    _logger.LogInformation("Simulated load change");
                    break;

                case 3: // Oscillation
                    _simulator.InjectOscillation(0.1 + _random.NextDouble() * 2.0, 0.01);
                    _logger.LogWarning("Simulated power oscillation");
                    break;

                case 4: // Voltage sag
                    _simulator.InjectVoltageSag(_random.Next(1, 118), 0.7 + _random.NextDouble() * 0.2);
                    _logger.LogWarning("Simulated voltage sag");
                    break;
            }
        }

        private static List<ChannelConfig> CreateChannelConfig(BusData bus)
        {
            var channels = new List<ChannelConfig>
            {
                // Voltage channels
                new ChannelConfig { Name = "VA", Type = ChannelType.Voltage, Phase = 'A' },
                new ChannelConfig { Name = "VB", Type = ChannelType.Voltage, Phase = 'B' },
                new ChannelConfig { Name = "VC", Type = ChannelType.Voltage, Phase = 'C' },
                
                // Current channels
                new ChannelConfig { Name = "IA", Type = ChannelType.Current, Phase = 'A' },
                new ChannelConfig { Name = "IB", Type = ChannelType.Current, Phase = 'B' },
                new ChannelConfig { Name = "IC", Type = ChannelType.Current, Phase = 'C' },
                
                // Sequence components
                new ChannelConfig { Name = "V1", Type = ChannelType.Voltage, Phase = '1' },
                new ChannelConfig { Name = "I1", Type = ChannelType.Current, Phase = '1' }
            };

            return channels;
        }

        private double AddNoise(double amplitude)
        {
            // Box-Muller transform for Gaussian noise
            var u1 = 1.0 - _random.NextDouble();
            var u2 = 1.0 - _random.NextDouble();
            var normal = Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Sin(2.0 * Math.PI * u2);
            return normal * amplitude;
        }

        private long GetSocTimestamp(DateTime timestamp)
        {
            var epoch = new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            return (long)(timestamp - epoch).TotalSeconds;
        }

        private int GetFracSec(DateTime timestamp)
        {
            // IEEE C37.118 FRACSEC format
            var fraction = timestamp.Millisecond * 1000 + timestamp.Microsecond;
            return fraction | (0x0 << 24); // Time quality in upper byte
        }
    }

    public class VirtualPmu
    {
        public int Id { get; set; }
        public int BusNumber { get; set; }
        public string Name { get; set; } = string.Empty;
        public double Latitude { get; set; }
        public double Longitude { get; set; }
        public double NominalVoltage { get; set; }
        public double NominalFrequency { get; set; }
        public DataFormat PhasorFormat { get; set; }
        public List<ChannelConfig> ConfiguredChannels { get; set; } = new();
    }

    public class ChannelConfig
    {
        public string Name { get; set; } = string.Empty;
        public ChannelType Type { get; set; }
        public char Phase { get; set; }
    }

    public enum ChannelType
    {
        Voltage,
        Current,
        Digital,
        Analog
    }
}