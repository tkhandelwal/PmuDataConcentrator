using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;

namespace PmuDataConcentrator.PMU.Emulator
{
    public class PowerSystemSimulator
    {
        private readonly List<BusData> _buses;
        private readonly List<TransmissionLine> _lines;
        private readonly Dictionary<int, PowerSystemState> _states;
        private readonly object _lock = new();

        // System parameters
        private double _systemFrequency = 60.0;
        private double _systemInertia = 5.0; // seconds
        private double _dampingFactor = 1.0;
        private double _time = 0;

        // Disturbance tracking
        private readonly List<Disturbance> _activeDisturbances = new();

        public PowerSystemSimulator(
            List<BusData> buses,
            List<TransmissionLine> lines,
            List<VirtualPmu> pmus)
        {
            _buses = buses;
            _lines = lines;

            // Initialize states
            _states = new Dictionary<int, PowerSystemState>();
            foreach (var bus in buses)
            {
                _states[bus.BusNumber] = new PowerSystemState
                {
                    BusNumber = bus.BusNumber,
                    VoltageMagnitude = 1.0, // pu
                    VoltageAngle = 0.0,
                    Frequency = 60.0,
                    Rocof = 0.0,
                    ActivePower = bus.GenMW - bus.LoadMW,
                    ReactivePower = bus.GenMVAR - bus.LoadMVAR,
                    GpsSync = true,
                    TimeQuality = 0,
                    LastUpdate = DateTime.UtcNow
                };
            }
        }

        public void Step(double deltaTime)
        {
            lock (_lock)
            {
                _time += deltaTime;

                // Update system dynamics
                UpdateFrequencyDynamics(deltaTime);
                UpdateVoltageDynamics(deltaTime);
                ProcessDisturbances(deltaTime);
                UpdatePowerFlows();

                // Add natural variations
                AddSystemNoise();
            }
        }

        private void UpdateFrequencyDynamics(double deltaTime)
        {
            // Swing equation: M * df/dt = Pm - Pe - D * delta_f
            double totalGeneration = _states.Values.Where(s => s.ActivePower > 0).Sum(s => s.ActivePower);
            double totalLoad = _states.Values.Where(s => s.ActivePower < 0).Sum(s => Math.Abs(s.ActivePower));

            double powerImbalance = totalGeneration - totalLoad;
            double frequencyDeviation = _systemFrequency - 60.0;

            // Calculate ROCOF
            double rocof = (powerImbalance - _dampingFactor * frequencyDeviation) / (_systemInertia * 60.0);

            // Update frequency
            _systemFrequency += rocof * deltaTime;

            // Apply governor response
            if (Math.Abs(frequencyDeviation) > 0.05)
            {
                double governorResponse = -20.0 * frequencyDeviation; // 5% droop
                _systemFrequency += governorResponse * deltaTime;
            }

            // Update all bus frequencies with local variations
            foreach (var state in _states.Values)
            {
                // Add inter-area oscillations
                double localOscillation = 0.01 * Math.Sin(2 * Math.PI * 0.3 * _time + state.BusNumber * 0.1);
                state.Frequency = _systemFrequency + localOscillation;
                state.Rocof = rocof + 0.1 * Math.Cos(2 * Math.PI * 0.3 * _time + state.BusNumber * 0.1);
            }
        }

        private void UpdateVoltageDynamics(double deltaTime)
        {
            // Simplified voltage dynamics
            foreach (var state in _states.Values)
            {
                var bus = _buses.First(b => b.BusNumber == state.BusNumber);

                // Voltage regulation
                double voltageError = 1.0 - state.VoltageMagnitude;
                if (bus.Type == BusType.Generator && Math.Abs(voltageError) > 0.01)
                {
                    state.VoltageMagnitude += 10.0 * voltageError * deltaTime; // AVR response
                }

                // Voltage angle dynamics based on power flow
                double angleChange = state.ActivePower * 0.001; // Simplified
                state.VoltageAngle += angleChange * deltaTime;

                // Keep angle within bounds
                if (state.VoltageAngle > Math.PI)
                    state.VoltageAngle -= 2 * Math.PI;
                else if (state.VoltageAngle < -Math.PI)
                    state.VoltageAngle += 2 * Math.PI;
            }
        }

        private void UpdatePowerFlows()
        {
            // Update current magnitudes based on power flow
            foreach (var state in _states.Values)
            {
                var bus = _buses.First(b => b.BusNumber == state.BusNumber);
                double apparentPower = Math.Sqrt(
                    state.ActivePower * state.ActivePower +
                    state.ReactivePower * state.ReactivePower);

                state.CurrentMagnitude = apparentPower / (state.VoltageMagnitude * bus.BaseKV * Math.Sqrt(3));
                state.CurrentAngle = state.VoltageAngle - Math.Atan2(state.ReactivePower, state.ActivePower);
            }
        }

        private void ProcessDisturbances(double deltaTime)
        {
            var completedDisturbances = new List<Disturbance>();

            foreach (var disturbance in _activeDisturbances)
            {
                disturbance.Duration -= deltaTime;

                if (disturbance.Duration <= 0)
                {
                    completedDisturbances.Add(disturbance);
                    continue;
                }

                switch (disturbance.Type)
                {
                    case DisturbanceType.Oscillation:
                        var oscillation =
                            disturbance.Magnitude * Math.Sin(2 * Math.PI * disturbance.Frequency * _time);
                        _systemFrequency += oscillation;
                        break;

                    case DisturbanceType.VoltageSag:
                        if (_states.ContainsKey(disturbance.Location))
                        {
                            _states[disturbance.Location].VoltageMagnitude = disturbance.Magnitude;
                        }
                        break;
                }
            }

            // Remove completed disturbances
            foreach (var completed in completedDisturbances)
            {
                _activeDisturbances.Remove(completed);

                // Restore normal conditions
                if (completed.Type == DisturbanceType.VoltageSag && _states.ContainsKey(completed.Location))
                {
                    _states[completed.Location].VoltageMagnitude = 1.0;
                }
            }
        }

        private void AddSystemNoise()
        {
            var random = new Random();

            foreach (var state in _states.Values)
            {
                // Add small random variations
                state.Frequency += (random.NextDouble() - 0.5) * 0.001;
                state.VoltageMagnitude += (random.NextDouble() - 0.5) * 0.0001;
                state.ActivePower += (random.NextDouble() - 0.5) * 0.1;
                state.ReactivePower += (random.NextDouble() - 0.5) * 0.1;
            }
        }

        public PowerSystemState GetBusState(int busNumber)
        {
            lock (_lock)
            {
                return _states.ContainsKey(busNumber)
                    ? _states[busNumber].Clone()
                    : new PowerSystemState { BusNumber = busNumber };
            }
        }

        // Disturbance injection methods
        public void TripGenerator(int busNumber)
        {
            lock (_lock)
            {
                if (_states.ContainsKey(busNumber))
                {
                    var bus = _buses.First(b => b.BusNumber == busNumber);
                    if (bus.Type == BusType.Generator)
                    {
                        _states[busNumber].ActivePower = -bus.LoadMW;
                        _states[busNumber].ReactivePower = -bus.LoadMVAR;
                    }
                }
            }
        }

        public void TripLine(int lineId)
        {
            lock (_lock)
            {
                // Simplified - just increase impedance
                if (lineId < _lines.Count)
                {
                    _lines[lineId].X *= 1000; // Effectively open circuit
                }
            }
        }

        public void ChangeLoad(int busNumber, double deltaMW)
        {
            lock (_lock)
            {
                if (_states.ContainsKey(busNumber))
                {
                    _states[busNumber].ActivePower -= deltaMW;
                }
            }
        }

        public void InjectOscillation(double frequency, double magnitude)
        {
            lock (_lock)
            {
                _activeDisturbances.Add(new Disturbance
                {
                    Type = DisturbanceType.Oscillation,
                    Frequency = frequency,
                    Magnitude = magnitude,
                    Duration = 10.0 // 10 seconds
                });
            }
        }

        public void InjectVoltageSag(int busNumber, double sagLevel)
        {
            lock (_lock)
            {
                _activeDisturbances.Add(new Disturbance
                {
                    Type = DisturbanceType.VoltageSag,
                    Location = busNumber,
                    Magnitude = sagLevel,
                    Duration = 0.5 // 500ms
                });
            }
        }
    }

    public class PowerSystemState
    {
        public int BusNumber { get; set; }
        public double VoltageMagnitude { get; set; }
        public double VoltageAngle { get; set; }
        public double Frequency { get; set; }
        public double Rocof { get; set; }
        public double ActivePower { get; set; }
        public double ReactivePower { get; set; }
        public double CurrentMagnitude { get; set; }
        public double CurrentAngle { get; set; }
        public bool GpsSync { get; set; }
        public bool DataError { get; set; }
        public bool Triggered { get; set; }
        public bool ConfigChanged { get; set; }
        public int TimeQuality { get; set; }
        public DateTime LastUpdate { get; set; }

        public PowerSystemState Clone()
        {
            return (PowerSystemState)MemberwiseClone();
        }
    }

    public class Disturbance
    {
        public DisturbanceType Type { get; set; }
        public int Location { get; set; }
        public double Frequency { get; set; }
        public double Magnitude { get; set; }
        public double Duration { get; set; }
    }

    public enum DisturbanceType
    {
        GeneratorTrip,
        LineOutage,
        LoadChange,
        Oscillation,
        VoltageSag
    }
}