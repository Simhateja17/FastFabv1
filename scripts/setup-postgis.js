import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupPostGIS() {
  try {
    // Enable PostGIS
    await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS postgis;`;
    console.log('PostGIS extension enabled');

    // Add location column
    await prisma.$executeRaw`
      DO $$ 
      BEGIN 
          IF NOT EXISTS (
              SELECT 1 
              FROM information_schema.columns 
              WHERE table_name = 'Seller' 
              AND column_name = 'location'
          ) THEN
              ALTER TABLE "Seller" ADD COLUMN location geography(Point, 4326);
          END IF;
      END $$;
    `;
    console.log('Location column added if it did not exist');

    // Update existing locations
    await prisma.$executeRaw`
      UPDATE "Seller"
      SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location IS NULL;
    `;
    console.log('Existing locations updated');

    // Create spatial index
    await prisma.$executeRaw`
      DO $$ 
      BEGIN 
          IF NOT EXISTS (
              SELECT 1
              FROM pg_class c
              JOIN pg_namespace n ON n.oid = c.relnamespace
              WHERE c.relname = 'idx_seller_location'
          ) THEN
              CREATE INDEX idx_seller_location ON "Seller" USING GIST (location);
          END IF;
      END $$;
    `;
    console.log('Spatial index created if it did not exist');

    // Create nearby sellers function
    await prisma.$executeRaw`
      CREATE OR REPLACE FUNCTION find_nearby_sellers(
          search_lat DOUBLE PRECISION,
          search_lng DOUBLE PRECISION,
          radius_km DOUBLE PRECISION DEFAULT 3,
          category_filter TEXT[] DEFAULT NULL
      ) 
      RETURNS TABLE (
          id TEXT,
          shop_name TEXT,
          address TEXT,
          city TEXT,
          state TEXT,
          pincode TEXT,
          categories TEXT[],
          latitude DOUBLE PRECISION,
          longitude DOUBLE PRECISION,
          distance DOUBLE PRECISION
      ) AS $$
      BEGIN
          RETURN QUERY
          SELECT 
              s.id,
              s."shopName",
              s.address,
              s.city,
              s.state,
              s.pincode,
              s.categories,
              s.latitude,
              s.longitude,
              ST_Distance(s.location, ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography) / 1000 as distance
          FROM "Seller" s
          WHERE 
              s."isVisible" = true 
              AND s."manuallyHidden" = false
              AND s.location IS NOT NULL
              AND ST_DWithin(
                  s.location,
                  ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
                  LEAST(radius_km, 3) * 1000  -- Convert km to meters, enforce 3km max
              )
              AND (category_filter IS NULL OR s.categories && category_filter)
          ORDER BY distance ASC;
      END;
      $$ LANGUAGE plpgsql;
    `;
    console.log('Nearby sellers function created/updated');

    console.log('PostGIS setup completed successfully');
  } catch (error) {
    console.error('Error setting up PostGIS:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupPostGIS()
  .catch(console.error); 