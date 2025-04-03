# Database Migrations

This directory contains SQL migration scripts for making changes to the database schema.

## Current Migrations

- `20240402_add_public_products_view.sql`: Adds the `PublicProducts` view and related indexes to filter products by seller visibility.

## Applying Migrations

### Automatic Method

Run the migration script from the project root:

```bash
npm run apply-migration
```

This will:
1. Install psql if it's not already installed
2. Apply the migration to your Neon DB
3. Update the Prisma client
4. Create a record of the applied migration

### Manual Method

If you prefer to apply migrations manually:

1. Install psql (see `docs/psql_installation.md` for instructions)
2. Get your database URL from the `.env` file
3. Run the following command:

```bash
psql "YOUR_DATABASE_URL" -f prisma/migrations/20240402_add_public_products_view.sql
```

4. Update the Prisma client:

```bash
npx prisma generate
```

## Migration Details

### PublicProducts View

The `PublicProducts` view is a filtered view of the `Product` table that only includes:
- Active products (`isActive = true`)
- Products from sellers with visibility turned on (`isVisible = true`)

This view is used by the public-facing APIs to automatically filter out products that shouldn't be visible to users.

### Schema Changes

The following changes were made to the Prisma schema:

1. Added the `PublicProducts` model that maps to the database view
2. Added a relation from `Seller` to `PublicProducts`
3. Added a relation from `ColorInventory` to `PublicProducts`

These changes ensure that we can use the view in our Prisma queries just like a regular model. 