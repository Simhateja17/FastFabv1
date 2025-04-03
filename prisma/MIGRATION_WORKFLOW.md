# Correct Database Migration Workflow

This document outlines the proper workflow for making database changes in this project.

## Important: Never use `npx prisma migrate`

In this project, we **NEVER** use the Prisma Migrate functionality (`npx prisma migrate dev` or `npx prisma migrate deploy`). This is important because we want to maintain full control over our database schema changes.

## The Correct Workflow

When making database changes, follow these steps:

### 1. Create a SQL Migration Script

Create a SQL file in the `prisma/migrations/` directory, for example:

```sql
-- Migration script for adding PublicProducts view and related changes
-- Created: 2024-04-02

-- Create the PublicProducts view
CREATE OR REPLACE VIEW "PublicProducts" AS
SELECT p.* FROM "Product" p
JOIN "Seller" s ON p."sellerId" = s.id
WHERE p."isActive" = TRUE AND s."isVisible" = TRUE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_seller_visibility" ON "Seller"("isVisible");
```

### 2. Apply the SQL Changes Directly

Apply the SQL file directly to the database using `psql` or another PostgreSQL client:

```
psql "YOUR_DATABASE_URL" -f prisma/migrations/your_migration.sql
```

### 3. Pull the Updated Schema from the Database

After applying the SQL changes, pull the updated schema from the database:

```
npx prisma db pull
```

This will update your `schema.prisma` file based on the current database structure.

### 4. Make Manual Adjustments to Schema.prisma (if needed)

After pulling the schema, you may need to manually add or adjust:

- Relation fields
- Model attributes
- Comments
- Mappings

For example, for the PublicProducts view, you might need to add:

```prisma
/// This view represents products that are active and from visible sellers
model PublicProducts {
  id             String           @id 
  name           String
  // ... other fields
  
  seller         Seller           @relation(fields: [sellerId], references: [id])
  colorInventory ColorInventory[]

  @@map("PublicProducts")
}
```

### 5. Generate the Prisma Client

After making manual adjustments, generate the Prisma client:

```
npx prisma generate
```

## Using the Automated Script

We've created a script that follows this workflow:

```
npm run apply-migration
```

This script will:
1. Apply the SQL migration directly
2. Pull the schema with `npx prisma db pull`
3. Remind you to make any necessary manual adjustments
4. Generate the Prisma client

## Why This Workflow?

This workflow gives us several advantages:

1. **Complete Control**: We manage exactly what SQL is executed
2. **Flexibility**: We can make changes that Prisma Migrate might not support
3. **Safety**: We can review and test SQL changes before applying them
4. **Compatibility**: Works well with our deployment processes

## Example: Adding a View

Views are a good example of why we use this workflow. Prisma Migrate doesn't natively support views, but our workflow allows us to:

1. Create a view with SQL
2. Pull the schema to get the basic model
3. Manually add relations to the view
4. Use the view in our Prisma queries

This is exactly what we did with the `PublicProducts` view to filter products by seller visibility. 