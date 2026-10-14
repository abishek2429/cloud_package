$ErrorActionPreference = "Stop"

Write-Host "=========================================================="
Write-Host "1. Testing Aggregated City Report (GET /api/coordinator/city-report)"
Write-Host "=========================================================="
$report = Invoke-RestMethod -Uri "http://localhost:5173/api/coordinator/city-report" -Method Get
Write-Host "Total Incidents: $($report.totalIncidents)"
Write-Host "System Status:   $($report.systemStatus)"
Write-Host "Responding Zones: $(($report.respondingZones) -join ', ')"

Write-Host "`n=========================================================="
Write-Host "2. Submitting Incident 1 (POST /api/coordinator/incidents)"
Write-Host "=========================================================="
$body = @{
    id = "INC-CENTRAL-NODEJS-TEST-101"
    zoneId = "CENTRAL"
    type = "ACCIDENT"
    severity = "HIGH"
    description = "Node.js distributed incident creation test on Central Ave"
    status = "ACTIVE"
} | ConvertTo-Json

$res1 = Invoke-RestMethod -Uri "http://localhost:5173/api/coordinator/incidents" -Method Post -Body $body -ContentType "application/json"
Write-Host "Result 1: ID=$($res1.id), Zone=$($res1.zoneId), Status=$($res1.status)"

Write-Host "`n=========================================================="
Write-Host "3. Submitting Duplicate Incident (Simulating Network Retry)"
Write-Host "=========================================================="
$res2 = Invoke-RestMethod -Uri "http://localhost:5173/api/coordinator/incidents" -Method Post -Body $body -ContentType "application/json"
Write-Host "Result 2 (Duplicate): ID=$($res2.id), Zone=$($res2.zoneId), Status=$($res2.status)"

Write-Host "`n=========================================================="
Write-Host "4. Testing Status Update (PATCH /api/incidents/:id/status)"
Write-Host "=========================================================="
$res3 = Invoke-RestMethod -Uri "http://localhost:5173/api/incidents/INC-CENTRAL-NODEJS-TEST-101/status?status=RESOLVED" -Method Patch
Write-Host "Updated Status: ID=$($res3.id), New Status=$($res3.status)"

Write-Host "`n=========================================================="
Write-Host "5. Verifying City Report reflects update"
Write-Host "=========================================================="
$reportAfter = Invoke-RestMethod -Uri "http://localhost:5173/api/coordinator/city-report" -Method Get
Write-Host "Total Incidents: $($reportAfter.totalIncidents)"
Write-Host "Resolved Incidents: $($reportAfter.resolvedIncidents)"
Write-Host "SUCCESS: Live API verification completed!"
