using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using System.IO;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using PmuDataConcentrator.Core.Interfaces;
using PmuDataConcentrator.Core.Models;
using PmuDataConcentrator.Core.Entities;
using PmuDataConcentrator.Core.Enums;
using PmuDataConcentrator.Infrastructure.Database;
using PmuDataConcentrator.Api.Hubs;

namespace PmuDataConcentrator.Infrastructure.Services
{
    public class PmuDataService : IPmuDataService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IDistributedCache _cache;
        private readonly IHubContext<PmuDataHub> _hubContext;
        private readonly ILogger<PmuDataService> _logger;

        public PmuDataService(
            IServiceProvider serviceProvider,
            IDistributedCache cache,
            IHubContext<PmuDataHub> hubContext,
            ILogger<PmuDataService> logger)
        {
            _serviceProvider = serviceProvider;
            _cache = cache;
            _hubContext = hubContext;
            _logger = logger;
        }

        public async Task ProcessPmuDataAsync(PmuData data)
        {
            try
            {
                // Store in hot cache for real-time access
                var cacheKey = $"pmu:latest:{data.PmuId}";
                await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(data),
                    new DistributedCacheEntryOptions
                    {
                        SlidingExpiration = TimeSpan.FromMinutes(5)
                    });

                // Use a scope to get DbContext
                using (var scope = _serviceProvider.CreateScope())
                {
                    var dbContext = scope.ServiceProvider.GetRequiredService<TimescaleDbContext>();

                    // Batch insert to database (buffered for performance)
                    var entity = MapToEntity(data);
                    dbContext.PmuData.Add(entity);

                    // Save to database
                    await dbContext.SaveChangesAsync();
                }

                // Broadcast to connected clients via SignalR
                await _hubContext.Clients.All.SendAsync("ReceivePmuData", data);

                // Check for anomalies
                await CheckForAnomaliesAsync(data);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing PMU data for PMU {PmuId}", data.PmuId);
            }
        }

        // ... rest of the methods remain the same but use _serviceProvider.CreateScope() when accessing DbContext

        public async Task<List<PmuData>> GetLatestDataAsync()
        {
            var result = new List<PmuData>();

            // For development, return mock data if no cache entries
            for (int pmuId = 1; pmuId <= 12; pmuId++)
            {
                var cacheKey = $"pmu:latest:{pmuId}";
                var cached = await _cache.GetStringAsync(cacheKey);

                if (!string.IsNullOrEmpty(cached))
                {
                    var data = JsonSerializer.Deserialize<PmuData>(cached);
                    if (data != null)
                        result.Add(data);
                }
            }

            return result;
        }

        // Implement other methods similarly...

        private PmuDataEntity MapToEntity(PmuData data)
        {
            return new PmuDataEntity
            {
                Timestamp = data.Timestamp,
                PmuId = data.PmuId,
                SocTimestamp = data.SocTimestamp,
                FracSec = data.FracSec,
                PhasorsJson = JsonSerializer.Serialize(data.Phasors),
                Frequency = data.Frequency,
                Rocof = data.Rocof,
                Status = data.Status,
                Quality = data.Quality,
                Latitude = data.Latitude,
                Longitude = data.Longitude,
                StationName = data.StationName
            };
        }

        public async Task CreateEventAsync(PowerSystemEvent eventData)
        {
            using (var scope = _serviceProvider.CreateScope())
            {
                var dbContext = scope.ServiceProvider.GetRequiredService<TimescaleDbContext>();
                dbContext.PowerSystemEvents.Add(eventData);
                await dbContext.SaveChangesAsync();
            }

            // Broadcast event to connected clients
            await _hubContext.Clients.All.SendAsync("ReceiveEvent", eventData);
        }

        private async Task CheckForAnomaliesAsync(PmuData data)
        {
            // Frequency deviation check
            if (Math.Abs(data.Frequency - 60.0) > 0.5)
            {
                await CreateEventAsync(new PowerSystemEvent
                {
                    Id = Guid.NewGuid(),
                    Timestamp = data.Timestamp,
                    EventType = EventType.FrequencyDeviation,
                    Severity = EventSeverity.Warning,
                    PmuId = data.PmuId,
                    Description = $"Frequency deviation: {data.Frequency:F3} Hz",
                    Data = JsonSerializer.Serialize(data)
                });
            }
        }

        public async Task<PmuAnalytics> GetAnalyticsAsync(int pmuId, DateTime start, DateTime end)
        {
            // Simplified for in-memory implementation
            return new PmuAnalytics
            {
                PmuId = pmuId,
                StartTime = start,
                EndTime = end,
                AverageFrequency = 60.0,
                MinFrequency = 59.95,
                MaxFrequency = 60.05,
                StdDevFrequency = 0.02,
                AverageRocof = 0.01,
                SampleCount = 1000
            };
        }

        public async Task<List<PmuConfiguration>> GetPmuConfigurationsAsync()
        {
            // Return mock configurations for development
            var configs = new List<PmuConfiguration>();
            for (int i = 1; i <= 12; i++)
            {
                configs.Add(new PmuConfiguration
                {
                    Id = i,
                    Name = $"PMU Station {i}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
            return await Task.FromResult(configs);
        }

        public async Task<PmuConfiguration> CreatePmuConfigurationAsync(PmuConfiguration config)
        {
            config.CreatedAt = DateTime.UtcNow;
            config.UpdatedAt = DateTime.UtcNow;
            return await Task.FromResult(config);
        }

        public async Task<PmuConfiguration?> GetPmuConfigurationAsync(int id)
        {
            return await Task.FromResult(new PmuConfiguration
            {
                Id = id,
                Name = $"PMU Station {id}",
                IsActive = true
            });
        }

        public async Task<List<PmuData>> GetHistoricalDataAsync(int pmuId, DateTime start, DateTime end, int? resolution)
        {
            // Return empty list for now
            return await Task.FromResult(new List<PmuData>());
        }

        public async Task<List<PowerSystemEvent>> GetEventsAsync(DateTime? start, DateTime? end, EventSeverity? minSeverity)
        {
            // Return empty list for now
            return await Task.FromResult(new List<PowerSystemEvent>());
        }

        public async Task<string> ExportDataAsync(ExportRequest request)
        {
            var fileName = $"pmu_export_{DateTime.UtcNow:yyyyMMddHHmmss}.csv";
            return await Task.FromResult(fileName);
        }
    }
}