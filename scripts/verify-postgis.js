import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyPostGIS() {
  try {
    // Check if PostGIS is enabled
    const postgisVersion = await prisma.$queryRaw`SELECT PostGIS_version();`;
    console.log('PostGIS version:', postgisVersion);

    // Check if the location column exists
    const locationColumn = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Seller' AND column_name = 'location';
    `;
    console.log('Location column:', locationColumn);

    // Check if the spatial index exists
    const spatialIndex = await prisma.$queryRaw`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'Seller' AND indexname = 'idx_seller_location';
    `;
    console.log('Spatial index:', spatialIndex);

    // Check if the function exists
    const function_exists = await prisma.$queryRaw`
      SELECT proname, prosrc
      FROM pg_proc
      WHERE proname = 'find_nearby_sellers';
    `;
    console.log('Function exists:', function_exists);

    // Test the function with sample coordinates
    const nearbySellers = await prisma.$queryRaw`
      SELECT * FROM find_nearby_sellers(
        17.4961523::float8,
        78.3356834::float8,
        3::float8,
        NULL
      );
    `;
    console.log('Sample nearby sellers query result:', nearbySellers);

    console.log('PostGIS verification completed successfully');
  } catch (error) {
    console.error('Error verifying PostGIS:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyPostGIS()
  .catch(console.error); 