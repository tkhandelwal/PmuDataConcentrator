using PmuDataConcentrator.Core.Entities;
using PmuDataConcentrator.Core.Enums;
using PmuDataConcentrator.Core.Models;

namespace PmuDataConcentrator.Core.Interfaces
{
    public interface IPmuDataService
    {
        Task ProcessPmuDataAsync(PmuData data);
        Task<List<PmuData>> GetLatestDataAsync();
        Task<PmuAnalytics> GetAnalyticsAsync(int pmuId, DateTime start, DateTime end);
        Task<List<PmuConfiguration>> GetPmuConfigurationsAsync();
        Task<PmuConfiguration> CreatePmuConfigurationAsync(PmuConfiguration config);
        Task<PmuConfiguration?> GetPmuConfigurationAsync(int id);
        Task<List<PmuData>> GetHistoricalDataAsync(int pmuId, DateTime start, DateTime end, int? resolution);
        Task<List<PowerSystemEvent>> GetEventsAsync(DateTime? start, DateTime? end, EventSeverity? minSeverity);
        Task<string> ExportDataAsync(ExportRequest request);
        Task CreateEventAsync(PowerSystemEvent eventData);
    }

    public class ExportRequest
    {
        public int[] PmuIds { get; set; } = Array.Empty<int>();
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public string Format { get; set; } = "CSV";
        public bool IncludeEvents { get; set; }
    }

    public class PmuAnalytics
    {
        public int PmuId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime EndTime { get; set; }
        public double AverageFrequency { get; set; }
        public double MinFrequency { get; set; }
        public double MaxFrequency { get; set; }
        public double StdDevFrequency { get; set; }
        public double AverageRocof { get; set; }
        public long SampleCount { get; set; }
    }
}