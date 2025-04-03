# PowerShell script to apply the migration to Neon DB
# This script requires psql to be installed

# Check if psql is installed
$psqlInstalled = $null
try {
    $psqlInstalled = Get-Command psql -ErrorAction Stop
    Write-Host "Found psql at: $($psqlInstalled.Source)"
} catch {
    Write-Host "psql is not installed. Installing now..." -ForegroundColor Yellow
    
    # Create a temporary directory for PostgreSQL installation
    $tempDir = Join-Path $env:TEMP "postgres-install"
    if (-not (Test-Path $tempDir)) {
        New-Item -ItemType Directory -Path $tempDir | Out-Null
    }
    
    # Download PostgreSQL installer
    $installerUrl = "https://get.enterprisedb.com/postgresql/postgresql-14.10-1-windows-x64.exe"
    $installerPath = Join-Path $tempDir "postgresql-installer.exe"
    
    Write-Host "Downloading PostgreSQL installer..."
    Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath
    
    # Install PostgreSQL with minimal components (just client tools)
    Write-Host "Installing PostgreSQL client tools..."
    Start-Process -FilePath $installerPath -ArgumentList "--mode unattended --unattendedmodeui minimal --disable-components server,stackbuilder --enable-components commandlinetools" -Wait
    
    # Add psql to PATH if not already there
    $pgPath = "C:\Program Files\PostgreSQL\14\bin"
    if (-not ($env:Path -split ';' -contains $pgPath)) {
        Write-Host "Adding PostgreSQL bin directory to PATH..."
        $env:Path += ";$pgPath"
        [Environment]::SetEnvironmentVariable("PATH", $env:Path, [System.EnvironmentVariableTarget]::User)
    }
    
    # Check if psql is now available
    try {
        $psqlInstalled = Get-Command psql -ErrorAction Stop
        Write-Host "Successfully installed psql at: $($psqlInstalled.Source)" -ForegroundColor Green
    } catch {
        Write-Host "Failed to install psql. Please install it manually and try again." -ForegroundColor Red
        exit 1
    }
}

# Get Database URL from environment
$envFile = ".env"
if (-not (Test-Path $envFile)) {
    Write-Host "Environment file (.env) not found. Looking for it in seller-service..."
    $sellerEnvFile = "seller-Service-2-main/seller-Service-2-main/.env"
    if (Test-Path $sellerEnvFile) {
        Write-Host "Found environment file in seller-service. Copying it..."
        Copy-Item $sellerEnvFile $envFile
    } else {
        Write-Host "No environment file found. Please create a .env file with DATABASE_URL." -ForegroundColor Red
        exit 1
    }
}

# Read and parse the DATABASE_URL
$envContent = Get-Content $envFile -Raw
$dbUrlMatch = [regex]::Match($envContent, 'DATABASE_URL=["''](.+?)["'']')
if (-not $dbUrlMatch.Success) {
    Write-Host "DATABASE_URL not found in .env file" -ForegroundColor Red
    exit 1
}

$dbUrl = $dbUrlMatch.Groups[1].Value
Write-Host "Found DATABASE_URL for Neon DB"

# Path to the migration SQL file
$migrationFile = "prisma/migrations/20240402_add_public_products_view.sql"
if (-not (Test-Path $migrationFile)) {
    Write-Host "Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

# Apply the migration
Write-Host "Applying migration..."
try {
    & psql $dbUrl -f $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Migration applied successfully!" -ForegroundColor Green
        
        # Now run prisma generate to update the client
        Write-Host "Updating Prisma client..."
        npx prisma generate
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Prisma client updated successfully!" -ForegroundColor Green
        } else {
            Write-Host "Failed to update Prisma client" -ForegroundColor Red
        }
    } else {
        Write-Host "Failed to apply migration" -ForegroundColor Red
    }
} catch {
    Write-Host "Error applying migration: $_" -ForegroundColor Red
}

# Create a record of the applied migration
$migrationRecord = @{
    name = "20240402_add_public_products_view"
    applied_at = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    script = $migrationFile
}

$recordsDir = "prisma/migration_records"
if (-not (Test-Path $recordsDir)) {
    New-Item -ItemType Directory -Path $recordsDir | Out-Null
}

$recordFile = Join-Path $recordsDir "20240402_add_public_products_view.json"
$migrationRecord | ConvertTo-Json | Set-Content $recordFile

Write-Host "Migration record created at: $recordFile" 