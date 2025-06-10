using System;
using System.Buffers.Binary;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Numerics;
using PmuDataConcentrator.Core.Models;
using PmuDataConcentrator.Core.Enums;

namespace PmuDataConcentrator.PMU.C37118
{
    public class C37118Parser
    {
        private const ushort SYNC_DATA = 0xAA01;
        private const ushort SYNC_CFG1 = 0xAA21;
        private const ushort SYNC_CFG2 = 0xAA31;
        private const ushort SYNC_CFG3 = 0xAA41;
        private const ushort SYNC_CMD = 0xAA11;

        private readonly ConcurrentDictionary<ushort, ConfigurationFrame> _configurations = new();

        public PmuFrame ParseFrame(byte[] buffer)
        {
            if (buffer.Length < 16) // Minimum frame size
                throw new ArgumentException("Buffer too small for C37.118 frame");

            var frame = new PmuFrame();
            int offset = 0;

            // Parse common header
            frame.Sync = BinaryPrimitives.ReadUInt16BigEndian(buffer.AsSpan(offset));
            offset += 2;

            frame.FrameSize = BinaryPrimitives.ReadUInt16BigEndian(buffer.AsSpan(offset));
            offset += 2;

            frame.IdCode = BinaryPrimitives.ReadUInt16BigEndian(buffer.AsSpan(offset));
            offset += 2;

            frame.SocTimestamp = BinaryPrimitives.ReadUInt32BigEndian(buffer.AsSpan(offset));
            offset += 4;

            frame.FracSec = BinaryPrimitives.ReadUInt32BigEndian(buffer.AsSpan(offset));
            offset += 4;

            // Parse based on frame type
            switch (frame.Sync)
            {
                case SYNC_DATA:
                    return ParseDataFrame(buffer, offset, frame);
                case SYNC_CFG2:
                    return ParseConfigFrame2(buffer, offset, frame);
                default:
                    throw new NotSupportedException($"Frame type {frame.Sync:X4} not supported");
            }
        }

        private PmuDataFrame ParseDataFrame(byte[] buffer, int offset, PmuFrame baseFrame)
        {
            var dataFrame = new PmuDataFrame(baseFrame);

            // Parse status
            dataFrame.Status = BinaryPrimitives.ReadUInt16BigEndian(buffer.AsSpan(offset));
            offset += 2;

            // Parse phasors (assuming configuration is known)
            var config = GetConfiguration(baseFrame.IdCode);

            foreach (var phasorCfg in config.Phasors)
            {
                var phasor = new Phasor
                {
                    Name = phasorCfg.Name,
                    Type = phasorCfg.Type
                };

                if (phasorCfg.Format == DataFormat.Rectangular)
                {
                    float real = BinaryPrimitives.ReadSingleBigEndian(buffer.AsSpan(offset));
                    offset += 4;
                    float imag = BinaryPrimitives.ReadSingleBigEndian(buffer.AsSpan(offset));
                    offset += 4;
                    phasor.Value = new Complex(real, imag);
                }
                else // Polar
                {
                    float magnitude = BinaryPrimitives.ReadSingleBigEndian(buffer.AsSpan(offset));
                    offset += 4;
                    float angle = BinaryPrimitives.ReadSingleBigEndian(buffer.AsSpan(offset));
                    offset += 4;
                    phasor.Value = Complex.FromPolarCoordinates(magnitude, angle);
                }

                dataFrame.Phasors.Add(phasor);
            }

            // Parse frequency and ROCOF
            dataFrame.Frequency = BinaryPrimitives.ReadSingleBigEndian(buffer.AsSpan(offset));
            offset += 4;

            dataFrame.Rocof = BinaryPrimitives.ReadSingleBigEndian(buffer.AsSpan(offset));
            offset += 4;

            return dataFrame;
        }

        private ConfigurationFrame ParseConfigFrame2(byte[] buffer, int offset, PmuFrame baseFrame)
        {
            var configFrame = new ConfigurationFrame
            {
                Sync = baseFrame.Sync,
                FrameSize = baseFrame.FrameSize,
                IdCode = baseFrame.IdCode,
                SocTimestamp = baseFrame.SocTimestamp,
                FracSec = baseFrame.FracSec
            };

            // Parse TIME_BASE
            uint timeBase = BinaryPrimitives.ReadUInt32BigEndian(buffer.AsSpan(offset));
            offset += 4;

            // Parse NUM_PMU
            ushort numPmu = BinaryPrimitives.ReadUInt16BigEndian(buffer.AsSpan(offset));
            offset += 2;

            // For simplicity, parsing only first PMU
            // Station name (16 bytes)
            configFrame.StationName = System.Text.Encoding.ASCII.GetString(buffer, offset, 16).Trim('\0');
            offset += 16;

            // ID code
            ushort idCode = BinaryPrimitives.ReadUInt16BigEndian(buffer.AsSpan(offset));
            offset += 2;

            // FORMAT
            ushort format = BinaryPrimitives.ReadUInt16BigEndian(buffer.AsSpan(offset));
            offset += 2;

            // PHNMR
            ushort phnmr = BinaryPrimitives.ReadUInt16BigEndian(buffer.AsSpan(offset));
            offset += 2;

            // ANNMR
            ushort annmr = BinaryPrimitives.ReadUInt16BigEndian(buffer.AsSpan(offset));
            offset += 2;

            // DGNMR
            ushort dgnmr = BinaryPrimitives.ReadUInt16BigEndian(buffer.AsSpan(offset));
            offset += 2;

            // Parse phasor channels
            int numPhasors = phnmr & 0x0FFF;
            for (int i = 0; i < numPhasors; i++)
            {
                var phasorDef = new PhasorDefinition
                {
                    Name = System.Text.Encoding.ASCII.GetString(buffer, offset, 16).Trim('\0'),
                    Type = ((format >> i) & 0x01) == 1 ? PhasorType.Voltage : PhasorType.Current,
                    Format = ((format >> (i + 8)) & 0x01) == 1 ? DataFormat.Polar : DataFormat.Rectangular
                };
                offset += 16;

                configFrame.Phasors.Add(phasorDef);
            }

            // Store configuration
            _configurations[configFrame.IdCode] = configFrame;

            return configFrame;
        }

        private ConfigurationFrame GetConfiguration(ushort idCode)
        {
            if (_configurations.TryGetValue(idCode, out var config))
                return config;

            return CreateDefaultConfiguration(idCode);
        }

        private ConfigurationFrame CreateDefaultConfiguration(ushort idCode)
        {
            var config = new ConfigurationFrame
            {
                IdCode = idCode,
                StationName = $"PMU_{idCode}",
                DataRate = 30
            };

            // Add default 3-phase voltage and current phasors
            for (int i = 0; i < 3; i++)
            {
                config.Phasors.Add(new PhasorDefinition
                {
                    Name = $"V{(char)('A' + i)}",
                    Type = PhasorType.Voltage,
                    Format = DataFormat.Polar,
                    ScaleFactor = 1.0f
                });
            }

            for (int i = 0; i < 3; i++)
            {
                config.Phasors.Add(new PhasorDefinition
                {
                    Name = $"I{(char)('A' + i)}",
                    Type = PhasorType.Current,
                    Format = DataFormat.Polar,
                    ScaleFactor = 1.0f
                });
            }

            return config;
        }
    }
}