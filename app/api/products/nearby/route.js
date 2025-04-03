import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { findSellersInRadius, haversineDistance } from '@/app/api/utils/haversine';

// Initialize Prisma with error handling
let prisma;
try {
  prisma = new PrismaClient();
} catch (err) {
  console.error("Failed to initialize Prisma client:", err);
  // Continue with the code - we'll check prisma before use
}

export async function GET(request) {
  try {
    console.log("API Request received for nearby products");
    if (!prisma) {
      console.error("Prisma client is not initialized");
      return NextResponse.json(
        { error: 'Database connection error', details: 'Failed to initialize database connection' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const latitude = parseFloat(searchParams.get('latitude'));
    const longitude = parseFloat(searchParams.get('longitude'));
    const radius = parseFloat(searchParams.get('radius') || 3);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const category = searchParams.get('category');
    const subcategory = searchParams.get('subcategory');
    const searchQuery = searchParams.get('search');
    const minPrice = parseFloat(searchParams.get('minPrice'));
    const maxPrice = parseFloat(searchParams.get('maxPrice'));
    
    // Debug: Log the raw fetchAll parameter value
    console.log(`Raw searchParams.get('fetchAll'):`, searchParams.get('fetchAll')); 
    
    const fetchAll = searchParams.get('fetchAll') === 'true'; // Read fetchAll param
    
    console.log(`API Request - Nearby Products:`, {
      coordinates: { latitude, longitude },
      radius,
      category,
      subcategory,
      page,
      limit,
      fetchAll, // Log fetchAll
      minPrice: isNaN(minPrice) ? undefined : minPrice, // Log parsed price
      maxPrice: isNaN(maxPrice) ? undefined : maxPrice  // Log parsed price
    });
    
    // Validate essential parameters
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      console.error("Invalid coordinates:", { latitude, longitude });
      return NextResponse.json(
        { error: 'Invalid coordinates', details: 'Latitude and longitude must be valid numbers' },
        { status: 400 }
      );
    }
    
    const skip = (page - 1) * limit;
    
    // Base query options (excluding pagination)
    const baseQueryOptions = {
      where: {
        AND: [],
      },
      orderBy: {
        createdAt: 'desc'
      }
    };
    
    // Add isActive filter by default
    baseQueryOptions.where.AND.push({ isActive: true });
    
    // Remove the incorrect seller relation filter
    // Instead, we need to join with the seller table to filter
    try {
      // First, get all visible sellers
      const visibleSellers = await prisma.seller.findMany({
        where: {
          isVisible: true
        },
        select: {
          id: true
        }
      });
      
      // Add the seller ID filter using the IN operator
      baseQueryOptions.where.AND.push({
        sellerId: {
          in: visibleSellers.map(seller => seller.id)
        }
      });
      
      console.log(`Applied visible seller filter with ${visibleSellers.length} visible sellers`);
    } catch (error) {
      console.error("Error filtering by visible sellers:", error);
      // If we can't filter by visible sellers, we'll just continue without this filter
    }
    
    // Add category filter if provided
    if (category) {
      try {
        baseQueryOptions.where.AND.push({
          category: category // Direct equality check since category is a string field
        });
        console.log(`Applying category filter: ${category}`);
      } catch (error) {
        console.error("Error adding category filter:", error);
        // Continue without category filter
      }
    }
    
    // Add subcategory filter if provided
    if (subcategory) {
      try {
        baseQueryOptions.where.AND.push({
          subcategory: subcategory // Direct equality check for subcategory
        });
        console.log(`Applying subcategory filter: ${subcategory}`);
      } catch (error) {
        console.error("Error adding subcategory filter:", error);
        // Continue without subcategory filter
      }
    }
    
    // Add price filter if provided
    if (!isNaN(minPrice) || !isNaN(maxPrice)) {
      const priceCondition = {};
      if (!isNaN(minPrice)) {
        priceCondition.gte = minPrice; // Greater than or equal to minPrice
        console.log(`Applying minPrice filter: >= ${minPrice}`);
      }
      if (!isNaN(maxPrice)) {
        priceCondition.lt = maxPrice;  // Less than maxPrice (as per client-side logic)
        console.log(`Applying maxPrice filter: < ${maxPrice}`);
      }
      
      if (Object.keys(priceCondition).length > 0) {
         try {
            baseQueryOptions.where.AND.push({ sellingPrice: priceCondition });
         } catch (error) {
            console.error("Error adding price filter:", error);
            // Continue without price filter
         }
      }
    }
    
    // Add search query if provided
    if (searchQuery) {
      try {
        baseQueryOptions.where.AND.push({
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } }
          ]
        });
      } catch (error) {
        console.error("Error adding search filter:", error);
        // Continue without search filter
      }
    }
    
    // If location is provided, first get all seller IDs within radius
    let nearbySellers = [];
    let productsWithDistance = [];
    let isLocationFilter = false;
    
    if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
      isLocationFilter = true;
      
      // IMPORTANT: Enforce 3km radius regardless of input for business requirements
      const enforceRadius = Math.min(radius, 3);
      console.log(`Finding sellers within ${enforceRadius}km of coordinates [${latitude}, ${longitude}] (original request radius: ${radius}km, enforced to 3km max)`);
      
      try {
        // Get all sellers with valid coordinates - NOTE: Using the seller model instead of user
        const sellers = await prisma.seller.findMany({
          where: {
            NOT: {
              OR: [
                { latitude: null },
                { longitude: null }
              ]
            }
          },
          select: {
            id: true,
            shopName: true, // Using shopName from seller model
            latitude: true,
            longitude: true
          }
        });
        
        console.log(`Found ${sellers.length} sellers with valid coordinates`);
        
        try {
          // Convert seller objects for compatibility with the findSellersInRadius function
          const adaptedSellers = sellers.map(seller => ({
            id: seller.id,
            name: seller.shopName,
            latitude: seller.latitude,
            longitude: seller.longitude
          }));
          
          // Filter sellers within radius with strict 3km limit
          nearbySellers = findSellersInRadius(adaptedSellers, latitude, longitude, enforceRadius);
          console.log(`Found ${nearbySellers.length} sellers within ${enforceRadius}km radius`);
          
          // Extra debug logging for distances (for all sellers)
          nearbySellers.forEach(seller => {
            console.log(`Seller '${seller.name}' distance: ${seller.distance}km from user location [${latitude}, ${longitude}]`);
          });
          
          // STRICT VALIDATION: Only allow sellers that are definitively within the radius
          nearbySellers = nearbySellers.filter(seller => 
            seller.distance !== null && 
            !isNaN(seller.distance) && 
            seller.distance <= enforceRadius
          );
          
          console.log(`After strict distance validation: ${nearbySellers.length} sellers within ${enforceRadius}km radius`);
          
          // Debug: Log seller distances to identify any issues
          console.log(`Nearby sellers and distances: ${JSON.stringify(nearbySellers.map(s => ({id: s.id, name: s.name, distance: s.distance})))}`);
        } catch (radiusError) {
          console.error("Error finding sellers in radius:", radiusError);
          nearbySellers = []; // Reset to empty array on error
        }
        
        // Add seller filter to query if nearby sellers found
        if (nearbySellers.length > 0) {
          const sellerIds = nearbySellers.map(seller => seller.id);
          baseQueryOptions.where.AND.push({
            sellerId: {
              in: sellerIds
            }
          });
        } else {
          // No nearby sellers found
          console.log("No sellers found within radius, returning empty product list");
          return NextResponse.json({
            products: [],
            isLocationFilter: true,
            totalProducts: 0,
            totalPages: 0,
            currentPage: page,
            message: "No sellers found within the specified radius"
          });
        }
      } catch (sellerError) {
        console.error("Error processing sellers:", sellerError);
        return NextResponse.json(
          { error: 'Seller processing error', details: sellerError.message },
          { status: 500 }
        );
      }
    }
    
    try {
      // Construct final arguments for findMany
      const findManyArgs = {
        where: baseQueryOptions.where,
        orderBy: baseQueryOptions.orderBy,
      };
      
      // When location filter is applied (3km radius), ensure we get ALL products
      // by using a very high take value instead of the default 20
      if (isLocationFilter) {
        findManyArgs.skip = 0;
        findManyArgs.take = 10000; // High value to ensure all products are returned
        console.log("Location-based search: Using high take value to return all products within 3km");
      } else {
        // For non-location searches, use normal pagination
        findManyArgs.skip = skip;
        findManyArgs.take = limit;
      }
      
      // Execute query with updated fields
      console.log("Final product query arguments:", JSON.stringify(findManyArgs, null, 2));

      const [products, totalProducts] = await Promise.all([
        prisma.product.findMany(findManyArgs), // Pass correctly structured args
        prisma.product.count({ where: baseQueryOptions.where }) // Count uses only where clause
      ]);
      
      console.log(`Query returned ${products.length} products, total count: ${totalProducts}`);
      
      // Get all unique seller IDs from the products
      const sellerIds = [...new Set(products.map(product => product.sellerId))];
      
      // Fetch seller details separately if there are products
      let sellerMap = new Map();
      if (sellerIds.length > 0) {
        const sellers = await prisma.seller.findMany({
          where: {
            id: {
              in: sellerIds
            }
          },
          select: {
            id: true,
            shopName: true,
            phone: true,
            latitude: true,
            longitude: true
          }
        });
        
        // Create a map of seller details by ID for quick lookups
        sellerMap = new Map(sellers.map(seller => [seller.id, seller]));
      }
      
      // Fetch color inventory data separately if there are products
      let colorInventoryMap = new Map();
      if (products.length > 0) {
        const productIds = products.map(product => product.id);
        
        const colorInventories = await prisma.colorInventory.findMany({
          where: {
            productId: {
              in: productIds
            }
          }
        });
        
        // Group color inventories by product ID
        colorInventories.forEach(inventory => {
          if (!colorInventoryMap.has(inventory.productId)) {
            colorInventoryMap.set(inventory.productId, []);
          }
          colorInventoryMap.get(inventory.productId).push(inventory);
        });
      }
      
      // Add seller information and color inventory to each product
      const productsWithData = products.map(product => {
        const seller = sellerMap.get(product.sellerId) || null;
        const colorInventory = colorInventoryMap.get(product.id) || [];
        
        return {
          ...product,
          seller: seller,
          colorInventory: colorInventory
        };
      });
      
      // Calculate total pages
      const totalPages = fetchAll ? 1 : Math.ceil(totalProducts / limit);
      
      // Add distance to products if location filter was applied
      if (isLocationFilter) {
        try {
          // Create a map of seller distances for quick lookup
          const sellerDistanceMap = new Map(
            nearbySellers.map(seller => [seller.id, seller.distance])
          );
          
          // Add distance to each product
          productsWithDistance = productsWithData.map(product => {
            const distance = sellerDistanceMap.get(product.sellerId) || null;
            return {
              ...product,
              distance,
              seller: product.seller ? {
                ...product.seller,
                distance
              } : null
            };
          });
          
          // Sort by distance if location filter applied
          productsWithDistance.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        } catch (distanceMapError) {
          console.error("Error adding distances to products:", distanceMapError);
          // Fall back to unsorted products without distance
          productsWithDistance = productsWithData;
        }
      }
      
      return NextResponse.json({
        products: isLocationFilter ? productsWithDistance : productsWithData,
        isLocationFilter,
        totalProducts,
        // Adjust pagination response based on fetchAll
        totalPages: fetchAll ? 1 : totalPages,
        currentPage: fetchAll ? 1 : page
      });
    } catch (queryError) {
      console.error("Error executing product query:", queryError);
      return NextResponse.json(
        { error: 'Product query error', details: queryError.message },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching nearby products:', error);
    // Return more detailed error information
    return NextResponse.json(
      { 
        error: 'Failed to fetch products', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 