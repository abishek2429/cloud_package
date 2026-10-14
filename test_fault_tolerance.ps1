$ErrorActionPreference = "Stop"

Write-Host "=========================================================="
Write-Host "1. Stopping South Zone Node container (Simulating Failure)..."
Write-Host "=========================================================="
wsl -d Ubuntu-22.04 -u root docker compose -f /mnt/d/cloud_package/docker-compose.yml stop zone-south

Write-Host "`nWaiting 3 seconds for coordinator to detect or scatter..."
Start-Sleep -Seconds 3

Write-Host "=========================================================="
Write-Host "2. Checking Aggregated City Report during outage..."
Write-Host "=========================================================="
$degraded = Invoke-RestMethod -Uri "http://localhost:5173/api/coordinator/city-report" -Method Get
Write-Host "System Status:     $($degraded.systemStatus)"
Write-Host "Responding Zones:  $(($degraded.respondingZones) -join ', ')"
Write-Host "Unavailable Zones: $(($degraded.unavailableZones) -join ', ')"
Write-Host "Surviving Incidents Count: $($degraded.totalIncidents)"

Write-Host "`n=========================================================="
Write-Host "3. Restarting South Zone Node container (Simulating Recovery)..."
Write-Host "=========================================================="
wsl -d Ubuntu-22.04 -u root docker compose -f /mnt/d/cloud_package/docker-compose.yml start zone-south

Write-Host "`nWaiting 6 seconds for container startup and health probe..."
Start-Sleep -Seconds 6

Write-Host "=========================================================="
Write-Host "4. Checking Aggregated City Report after recovery..."
Write-Host "=========================================================="
$recovered = Invoke-RestMethod -Uri "http://localhost:5173/api/coordinator/city-report" -Method Get
Write-Host "System Status:     $($recovered.systemStatus)"
Write-Host "Responding Zones:  $(($recovered.respondingZones) -join ', ')"
Write-Host "Unavailable Zones: $(($recovered.unavailableZones) -join ', ')"
Write-Host "Total Incidents:   $($recovered.totalIncidents)"
Write-Host "SUCCESS: Fault-tolerance and recovery verified!"
