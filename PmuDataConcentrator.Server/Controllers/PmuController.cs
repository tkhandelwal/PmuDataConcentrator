using Microsoft.AspNetCore.Mvc;
using PmuDataConcentrator.Core.Interfaces;
using PmuDataConcentrator.Core.Models;
using PmuDataConcentrator.Core.Entities;
using PmuDataConcentrator.Core.Enums;

namespace PmuDataConcentrator.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PmuController : ControllerBase
    {
        private readonly IPmuDataService _dataService;
        private readonly IConfiguration _configuration;

        public PmuController(IPmuDataService dataService, IConfiguration configuration)
        {
            _dataService = dataService;
            _configuration = configuration;
        }

        [HttpGet("configurations")]
        public async Task<IActionResult> GetConfigurations()
        {
            var configs = await _dataService.GetPmuConfigurationsAsync();
            return Ok(configs);
        }

        [HttpPost("configurations")]
        public async Task<IActionResult> CreateConfiguration([FromBody] PmuConfiguration config)
        {
            var result = await _dataService.CreatePmuConfigurationAsync(config);
            return CreatedAtAction(nameof(GetConfiguration), new { id = result.Id }, result);
        }

        [HttpGet("configurations/{id}")]
        public async Task<IActionResult> GetConfiguration(int id)
        {
            var config = await _dataService.GetPmuConfigurationAsync(id);
            if (config == null)
                return NotFound();

            return Ok(config);
        }

        [HttpGet("data/latest")]
        public async Task<IActionResult> GetLatestData()
        {
            var data = await _dataService.GetLatestDataAsync();
            return Ok(data);
        }

        [HttpGet("data/historical")]
        public async Task<IActionResult> GetHistoricalData(
            [FromQuery] int pmuId,
            [FromQuery] DateTime start,
            [FromQuery] DateTime end,
            [FromQuery] int? resolution = null)
        {
            var data = await _dataService.GetHistoricalDataAsync(pmuId, start, end, resolution);
            return Ok(data);
        }

        [HttpGet("analytics/{pmuId}")]
        public async Task<IActionResult> GetAnalytics(
            int pmuId,
            [FromQuery] DateTime start,
            [FromQuery] DateTime end)
        {
            var analytics = await _dataService.GetAnalyticsAsync(pmuId, start, end);
            return Ok(analytics);
        }

        [HttpGet("events")]
        public async Task<IActionResult> GetEvents(
            [FromQuery] DateTime? start,
            [FromQuery] DateTime? end,
            [FromQuery] EventSeverity? minSeverity = null)
        {
            var events = await _dataService.GetEventsAsync(start, end, minSeverity);
            return Ok(events);
        }

        [HttpPost("export")]
        public async Task<IActionResult> ExportData([FromBody] ExportRequest request)
        {
            var exportPath = await _dataService.ExportDataAsync(request);
            return Ok(new { path = exportPath });
        }
    }
}