# Clean solution
Write-Host "Cleaning solution..." -ForegroundColor Yellow
dotnet clean

# Restore packages
Write-Host "Restoring packages..." -ForegroundColor Yellow
dotnet restore

# Build Core project first
Write-Host "Building Core project..." -ForegroundColor Yellow
dotnet build PmuDataConcentrator.Core/PmuDataConcentrator.Core.csproj

# Build PMU project
Write-Host "Building PMU project..." -ForegroundColor Yellow
dotnet build PmuDataConcentrator.PMU/PmuDataConcentrator.PMU.csproj

# Build Infrastructure project
Write-Host "Building Infrastructure project..." -ForegroundColor Yellow
dotnet build PmuDataConcentrator.Infrastructure/PmuDataConcentrator.Infrastructure.csproj

# Build API project
Write-Host "Building API project..." -ForegroundColor Yellow
dotnet build PmuDataConcentrator.Api/PmuDataConcentrator.Api.csproj

Write-Host "Build completed successfully!" -ForegroundColor Green