# Individual steps to apply manual visibility override
# Run each command one at a time to verify success

# Step 1: Apply the database migration
# This adds the manuallyHidden field to the Seller table and fixes the PublicProducts view
Write-Host "To apply the database migration, run:" -ForegroundColor Yellow
Write-Host "node scripts/apply_manual_visibility_migration.js" -ForegroundColor Cyan

# Step 2: Pull the updated schema from the database
# This ensures the schema includes the new field and view
Write-Host "`nTo update the Prisma schema, run:" -ForegroundColor Yellow
Write-Host "npx prisma db pull" -ForegroundColor Cyan

# Step 3: Generate updated Prisma client
# This updates the Prisma client to include the new field
Write-Host "`nTo generate the updated Prisma client, run:" -ForegroundColor Yellow
Write-Host "npx prisma generate" -ForegroundColor Cyan

# Step 4: Restart the seller service
# To restart the seller service, stop and start it
Write-Host "`nTo restart the seller service, navigate to the service directory and run:" -ForegroundColor Yellow
Write-Host "cd seller-Service-2-main/seller-Service-2-main" -ForegroundColor Cyan
Write-Host "node src/server.js" -ForegroundColor Cyan

Write-Host "`nAfter completing these steps, the visibility override system will be active." -ForegroundColor Green 