# PowerShell script to apply the migration to Neon DB following the correct workflow
# 1. Apply SQL changes directly with psql
# 2. Run npx prisma db pull to update schema
# 3. Make manual adjustments to schema.prisma

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

# STEP 1: Apply the SQL migration directly
Write-Host "STEP 1: Applying direct SQL changes to the database..." -ForegroundColor Cyan
try {
    & psql $dbUrl -f $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "SQL migration applied successfully!" -ForegroundColor Green
    } else {
        Write-Host "Failed to apply SQL migration" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error applying SQL migration: $_" -ForegroundColor Red
    exit 1
}

# STEP 2: Pull the updated schema from the database
Write-Host "STEP 2: Pulling updated schema from database with 'npx prisma db pull'..." -ForegroundColor Cyan
try {
    npx prisma db pull
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Prisma schema updated successfully with db pull!" -ForegroundColor Green
    } else {
        Write-Host "Failed to pull database schema" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Error pulling database schema: $_" -ForegroundColor Red
    exit 1
}

# STEP 3: Remind about manual schema adjustments
Write-Host "STEP 3: Make any necessary manual adjustments to schema.prisma" -ForegroundColor Cyan
Write-Host @"
IMPORTANT: You may need to manually adjust the schema.prisma file to:
1. Add the proper relation fields for PublicProducts
2. Add any additional model attributes or comments
3. Fix any relation issues

After making manual changes, run 'npx prisma generate' to update the client.
"@ -ForegroundColor Yellow

# STEP 4: Update the Prisma client based on the schema
Write-Host "Generating Prisma client based on current schema..." -ForegroundColor Cyan
try {
    npx prisma generate
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Prisma client generated successfully!" -ForegroundColor Green
    } else {
        Write-Host "Failed to generate Prisma client" -ForegroundColor Red
    }
} catch {
    Write-Host "Error generating Prisma client: $_" -ForegroundColor Red
}

# Create a record of the applied migration
$migrationRecord = @{
    name = "20240402_add_public_products_view"
    applied_at = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"
    script = $migrationFile
    workflow = "manual-sql-then-db-pull"
}

$recordsDir = "prisma/migration_records"
if (-not (Test-Path $recordsDir)) {
    New-Item -ItemType Directory -Path $recordsDir | Out-Null
}

$recordFile = Join-Path $recordsDir "20240402_add_public_products_view.json"
$migrationRecord | ConvertTo-Json | Set-Content $recordFile

Write-Host "Migration record created at: $recordFile" -ForegroundColor Green
Write-Host "Migration workflow completed!" -ForegroundColor Green 