using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace PmuDataConcentrator.Infrastructure.Services
{
    public class DataProcessingService : BackgroundService
    {
        private readonly ILogger<DataProcessingService> _logger;

        public DataProcessingService(ILogger<DataProcessingService> logger)
        {
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Data Processing Service started");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Perform periodic data processing tasks
                    // e.g., data aggregation, cleanup, etc.

                    await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in data processing service");
                }
            }
        }
    }
}