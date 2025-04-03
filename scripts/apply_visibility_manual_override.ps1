# PowerShell script to apply seller visibility migration safely

# Ensure we're in the right directory
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $projectRoot

Write-Host "Starting seller visibility migration script..." -ForegroundColor Cyan

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "Environment file (.env) not found!" -ForegroundColor Red
    
    # Look for env file in seller service
    $sellerEnvPath = Join-Path $projectRoot "seller-Service-2-main\seller-Service-2-main\.env"
    if (Test-Path $sellerEnvPath) {
        Write-Host "Found environment file in seller service. Copying it..." -ForegroundColor Yellow
        Copy-Item $sellerEnvPath ".env"
        Write-Host "Environment file copied successfully." -ForegroundColor Green
    } else {
        Write-Host "No environment file found. Please create a .env file with DATABASE_URL." -ForegroundColor Red
        exit 1
    }
}

# Check if the migration SQL file exists
$migrationPath = Join-Path $projectRoot "prisma\migrations\seller_visibility\migration.sql"
if (-not (Test-Path $migrationPath)) {
    Write-Host "Migration SQL file not found: $migrationPath" -ForegroundColor Red
    exit 1
}

# Apply the migration using Node.js script
Write-Host "Applying seller visibility migration..." -ForegroundColor Cyan
try {
    node scripts/apply_manual_visibility_migration.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Migration application failed with exit code $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
} catch {
    Write-Host "Error running migration script: $_" -ForegroundColor Red
    exit 1
}

# Run Prisma DB pull to sync schema
Write-Host "Pulling updated schema from database..." -ForegroundColor Cyan
try {
    npx prisma db pull
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to pull database schema" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error pulling database schema: $_" -ForegroundColor Red
    exit 1
}

# Generate Prisma client
Write-Host "Generating Prisma client..." -ForegroundColor Cyan
try {
    npx prisma generate
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to generate Prisma client" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error generating Prisma client: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Migration completed successfully!" -ForegroundColor Green
Write-Host @"

Next steps:
1. Verify the Seller table now has isVisible and manuallyHidden columns
2. Restart the application to apply changes using: npm run dev
"@ -ForegroundColor Yellow 