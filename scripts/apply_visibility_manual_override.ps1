# Apply manual visibility override migration
Write-Host "Starting visibility override migration..." -ForegroundColor Cyan

# Step 1: Apply the database migration
Write-Host "Step 1: Applying database migration..." -ForegroundColor Yellow
node scripts/apply_manual_visibility_migration.js; 

# Step 2: Pull the updated schema from the database
Write-Host "`nStep 2: Pulling updated schema from database..." -ForegroundColor Yellow
npx prisma db pull;

# Step 3: Generate updated Prisma client
Write-Host "`nStep 3: Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate;

# Step 4: Restart the seller service
Write-Host "`nStep 4: Restarting seller service..." -ForegroundColor Yellow
$sellerServiceDir = "seller-Service-2-main/seller-Service-2-main"

# Navigate to seller service directory
Push-Location $sellerServiceDir; 

# Stop any running instances (find and kill the Node process)
# This is a safe approach using PowerShell
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*$sellerServiceDir*" }
if ($nodeProcesses) {
    Write-Host "Stopping existing seller service processes..." -ForegroundColor Yellow
    $nodeProcesses | ForEach-Object { Stop-Process -Id $_.Id -Force }
    # Give it a moment to fully terminate
    Start-Sleep -Seconds 2
}

# Start the seller service (in background)
Write-Host "Starting seller service..." -ForegroundColor Green
Start-Process -FilePath "node" -ArgumentList "src/server.js" -NoNewWindow;

# Return to original directory
Pop-Location;

Write-Host "`nMigration complete!" -ForegroundColor Green
Write-Host "The seller service has been updated with manual visibility override functionality." -ForegroundColor Cyan
Write-Host "You can now test the functionality as described in the docs/MANUAL_VISIBILITY_MIGRATION.md file." -ForegroundColor Cyan 