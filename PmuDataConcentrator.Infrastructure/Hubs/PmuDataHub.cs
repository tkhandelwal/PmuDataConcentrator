using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using PmuDataConcentrator.Core.Interfaces;

namespace PmuDataConcentrator.Api.Hubs
{
    public class PmuDataHub : Hub
    {
        private readonly IPmuDataService _dataService;
        private readonly ILogger<PmuDataHub> _logger;

        public PmuDataHub(IPmuDataService dataService, ILogger<PmuDataHub> logger)
        {
            _dataService = dataService;
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            _logger.LogInformation("Client connected: {ConnectionId}", Context.ConnectionId);

            // Send latest data to newly connected client
            var latestData = await _dataService.GetLatestDataAsync();
            await Clients.Caller.SendAsync("InitialData", latestData);

            await base.OnConnectedAsync();
        }

        public async Task SubscribeToPmu(int pmuId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"pmu-{pmuId}");
            _logger.LogInformation("Client {ConnectionId} subscribed to PMU {PmuId}",
                Context.ConnectionId, pmuId);
        }

        public async Task UnsubscribeFromPmu(int pmuId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"pmu-{pmuId}");
        }

        public async Task RequestAnalytics(int pmuId, DateTime start, DateTime end)
        {
            var analytics = await _dataService.GetAnalyticsAsync(pmuId, start, end);
            await Clients.Caller.SendAsync("ReceiveAnalytics", analytics);
        }
    }
}