using Microsoft.EntityFrameworkCore;
using PmuDataConcentrator.Api.Hubs;
using PmuDataConcentrator.Core.Interfaces;
using PmuDataConcentrator.Infrastructure.Database;
using PmuDataConcentrator.Infrastructure.Services;
using PmuDataConcentrator.PMU.Emulator;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
    {
        policy.WithOrigins(
                "http://localhost:24925",  // Add this - your Angular port
                "http://localhost:4200",   // Keep this for standard Angular port
                "http://localhost:*"       // Or use this to allow any localhost port
            )
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// Use In-Memory Database
builder.Services.AddDbContext<TimescaleDbContext>(options =>
    options.UseInMemoryDatabase("PmuDataConcentrator"));

// Use In-Memory Cache
builder.Services.AddDistributedMemoryCache();

// Configure SignalR
builder.Services.AddSignalR();

// Register services as Singleton
builder.Services.AddSingleton<IPmuDataService, PmuDataService>();
builder.Services.AddScoped<TimescaleDbContext>();
builder.Services.AddHostedService<PmuEmulator>();
builder.Services.AddHostedService<DataProcessingService>();

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAngular");
app.UseAuthorization();

app.MapControllers();
app.MapHub<PmuDataHub>("/hubs/pmudata");

// Remove any app.UseSpa() or similar calls

app.Run();