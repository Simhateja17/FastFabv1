# Update Prisma client with latest schema
Write-Host "Updating Prisma schema..."

# Run Prisma db pull to introspect the database schema
npx prisma db pull

# Generate the Prisma client 
# Note: We try to generate again even if there's a permission error because sometimes it works on retry
try {
    npx prisma generate
} catch {
    Write-Host "Retrying client generation after error..."
    Start-Sleep -s 1
    npx prisma generate
}

# Apply custom migration for WhatsApp OTP
Write-Host "Applying custom migration..."
node apply-migration.js

Write-Host "Schema update completed!" 