using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PmuDataConcentrator.Core.Entities;

namespace PmuDataConcentrator.Infrastructure.Database
{
    public class TimescaleDbContext : DbContext
    {
        public TimescaleDbContext(DbContextOptions<TimescaleDbContext> options)
            : base(options) { }

        public DbSet<PmuDataEntity> PmuData { get; set; }
        public DbSet<PmuConfiguration> PmuConfigurations { get; set; }
        public DbSet<PowerSystemEvent> PowerSystemEvents { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Configure hypertable for time-series data
            modelBuilder.Entity<PmuDataEntity>(entity =>
            {
                entity.ToTable("pmu_data");
                entity.HasKey(e => new { e.Timestamp, e.PmuId });

                entity.Property(e => e.Timestamp)
                    .HasColumnType("timestamptz");

                entity.Property(e => e.PhasorsJson)
                    .HasColumnType("jsonb");

                entity.HasIndex(e => e.PmuId);
                entity.HasIndex(e => e.Timestamp);
                entity.HasIndex(e => e.Quality);
            });

            modelBuilder.Entity<PowerSystemEvent>(entity =>
            {
                entity.ToTable("power_system_events");
                entity.HasIndex(e => e.Timestamp);
                entity.HasIndex(e => e.EventType);
                entity.HasIndex(e => e.Severity);
            });
        }
    }

    public class TimescaleDbInitializer
    {
        public static async Task InitializeAsync(TimescaleDbContext context)
        {
            await context.Database.EnsureCreatedAsync();

            // Create TimescaleDB extension
            await context.Database.ExecuteSqlRawAsync(
                "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;");

            // Convert tables to hypertables
            await context.Database.ExecuteSqlRawAsync(
                "SELECT create_hypertable('pmu_data', 'timestamp', if_not_exists => TRUE);");

            // Create continuous aggregates for performance
            await context.Database.ExecuteSqlRawAsync(@"
                CREATE MATERIALIZED VIEW IF NOT EXISTS pmu_data_1min
                WITH (timescaledb.continuous) AS
                SELECT 
                    pmu_id,
                    time_bucket('1 minute', timestamp) AS bucket,
                    AVG(frequency) as avg_frequency,
                    MIN(frequency) as min_frequency,
                    MAX(frequency) as max_frequency,
                    AVG(rocof) as avg_rocof,
                    COUNT(*) as sample_count
                FROM pmu_data
                GROUP BY pmu_id, bucket
                WITH NO DATA;
            ");

            // Add retention policy (keep raw data for 7 days)
            await context.Database.ExecuteSqlRawAsync(
                "SELECT add_retention_policy('pmu_data', INTERVAL '7 days', if_not_exists => TRUE);");
        }
    }
}