$ErrorActionPreference = "Stop"
$src = "d:\cloud_package"
$dest = "d:\cloud_package\submission\distributed-traffic-monitoring-system"
$zipPath = "d:\cloud_package\distributed-traffic-monitoring-system-submission.zip"

Write-Host "Cleaning previous submission artifacts..."
if (Test-Path "d:\cloud_package\submission") { Remove-Item -Recurse -Force "d:\cloud_package\submission" }
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }

New-Item -ItemType Directory -Path $dest -Force | Out-Null

Write-Host "Copying core project files..."
Copy-Item "$src\README.md" "$dest\"
Copy-Item "$src\.gitignore" "$dest\"
Copy-Item "$src\docker-compose.yml" "$dest\"
Copy-Item "$src\test_api.ps1" "$dest\"
Copy-Item "$src\test_fault_tolerance.ps1" "$dest\"
Copy-Item -Recurse "$src\docs" "$dest\docs"

Write-Host "Copying coordinator-service (excluding node_modules)..."
New-Item -ItemType Directory -Path "$dest\coordinator-service" -Force | Out-Null
Copy-Item "$src\coordinator-service\package.json" "$dest\coordinator-service\"
Copy-Item "$src\coordinator-service\package-lock.json" "$dest\coordinator-service\"
Copy-Item "$src\coordinator-service\Dockerfile" "$dest\coordinator-service\"
Copy-Item -Recurse "$src\coordinator-service\src" "$dest\coordinator-service\src"
Copy-Item -Recurse "$src\coordinator-service\tests" "$dest\coordinator-service\tests"

Write-Host "Copying zone-node (excluding node_modules)..."
New-Item -ItemType Directory -Path "$dest\zone-node" -Force | Out-Null
Copy-Item "$src\zone-node\package.json" "$dest\zone-node\"
Copy-Item "$src\zone-node\package-lock.json" "$dest\zone-node\"
Copy-Item "$src\zone-node\Dockerfile" "$dest\zone-node\"
Copy-Item -Recurse "$src\zone-node\src" "$dest\zone-node\src"
Copy-Item -Recurse "$src\zone-node\tests" "$dest\zone-node\tests"

Write-Host "Copying dashboard (excluding node_modules and dist)..."
New-Item -ItemType Directory -Path "$dest\dashboard" -Force | Out-Null
Copy-Item "$src\dashboard\package.json" "$dest\dashboard\"
Copy-Item "$src\dashboard\package-lock.json" "$dest\dashboard\"
Copy-Item "$src\dashboard\vite.config.js" "$dest\dashboard\"
Copy-Item "$src\dashboard\index.html" "$dest\dashboard\"
Copy-Item "$src\dashboard\.env.example" "$dest\dashboard\"
Copy-Item -Recurse "$src\dashboard\src" "$dest\dashboard\src"

$fileCount = (Get-ChildItem -Recurse $dest | Where-Object { -not $_.PSIsContainer }).Count
Write-Host "Total source files copied: $fileCount"

Write-Host "Verifying no forbidden files (target, node_modules, dist, .env)..."
$forbidden = Get-ChildItem -Recurse $dest | Where-Object { 
    $_.FullName -match "\\\\(target|node_modules|dist)($|\\\\)" -or 
    $_.Name -eq ".env"
}

if ($forbidden) {
    Write-Error "Forbidden files found in submission directory: $($forbidden.Count) items"
} else {
    Write-Host "Verification PASSED: Submission directory is 100% clean."
}

Write-Host "Creating submission ZIP archive at: $zipPath ..."
Compress-Archive -Path "$dest\*" -DestinationPath $zipPath -CompressionLevel Optimal

$zipItem = Get-Item $zipPath
$zipSizeKb = [math]::Round($zipItem.Length / 1024, 2)
Write-Host "SUCCESS: ZIP archive created at $($zipItem.FullName) ($zipSizeKb KB)"
