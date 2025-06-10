using Microsoft.AspNetCore.Http.Connections;
using Microsoft.EntityFrameworkCore;
using PmuDataConcentrator.Api.Hubs;
using PmuDataConcentrator.Core.Interfaces;
using PmuDataConcentrator.Infrastructure.Database;
using PmuDataConcentrator.Infrastructure.Services;
using PmuDataConcentrator.PMU.Emulator;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure CORS with proper settings
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins(
                "http://localhost:4200",
                "http://localhost:24925",
                "https://localhost:4200",
                "https://localhost:24925"
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials()
            .SetIsOriginAllowed((host) => true); // Be careful with this in production
    });
});

// Configure SignalR with proper JSON serialization
builder.Services.AddSignalR(options =>
{
    options.EnableDetailedErrors = true;
    options.MaximumReceiveMessageSize = 1024 * 1024; // 1MB
    options.StreamBufferCapacity = 100;
}).AddJsonProtocol(options =>
{
    // Configure camelCase for SignalR
    options.PayloadSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.PayloadSerializerOptions.WriteIndented = true;
});


// Configure database - use PostgreSQL with TimescaleDB for production
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddDbContext<TimescaleDbContext>(options =>
        options.UseInMemoryDatabase("PmuDataConcentrator"));
}
else
{
    builder.Services.AddDbContext<TimescaleDbContext>(options =>
        options.UseNpgsql(builder.Configuration.GetConnectionString("TimescaleDB")));
}

// Configure Redis for distributed caching
if (builder.Environment.IsDevelopment())
{
    builder.Services.AddDistributedMemoryCache();
}
else
{
    builder.Services.AddStackExchangeRedisCache(options =>
    {
        options.Configuration = builder.Configuration.GetConnectionString("Redis");
        options.InstanceName = "PmuDataConcentrator";
    });
}

// Register services
builder.Services.AddSingleton<IPmuDataService, PmuDataService>();
builder.Services.AddHostedService<PmuEmulator>();
builder.Services.AddHostedService<DataProcessingService>();

// Add response compression for performance
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
});

var app = builder.Build();

// Initialize database
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<TimescaleDbContext>();
    if (!builder.Environment.IsDevelopment())
    {
        await TimescaleDbInitializer.InitializeAsync(context);
    }
}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseResponseCompression();
app.UseHttpsRedirection();

// CORS must come before routing
app.UseCors("AllowAngular");

app.UseRouting();
app.UseAuthorization();

app.MapControllers();
app.MapHub<PmuDataHub>("/hubs/pmudata", options =>
{
    options.Transports = HttpTransportType.WebSockets | HttpTransportType.ServerSentEvents | HttpTransportType.LongPolling;
});

app.Run();