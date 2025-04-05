import { NextResponse } from 'next/server';
import prisma from '@/app/api/lib/prisma';

// Simple in-memory cache to prevent redundant searches
const searchCache = new Map();
const CACHE_TTL = 60 * 1000; // 1 minute cache

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1, lon1, lat2, lon2) {
  // Safety check for valid coordinates
  if (!lat1 || !lon1 || !lat2 || !lon2 || 
      isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    console.warn('Invalid coordinates for distance calculation:', { lat1, lon1, lat2, lon2 });
    return Infinity; // Return infinity for invalid coords to sort them last
  }

  try {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d;
  } catch (error) {
    console.error('Error calculating distance:', error);
    return Infinity; // Return infinity for errors to sort them last
  }
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * GET handler for product search
 * Route: /api/products/search
 * 
 * Query parameters:
 * - search: The search query string
 * - category: (optional) Filter by category
 * - limit: (optional) Number of results to return (default: 20)
 * - page: (optional) Page number for pagination (default: 1)
 * - minPrice: (optional) Minimum price filter
 * - maxPrice: (optional) Maximum price filter
 * - latitude: (optional) Location latitude for proximity search
 * - longitude: (optional) Location longitude for proximity search
 * - radius: (optional) Search radius in km (default: 3)
 */
export async function GET(request) {
  console.log("Search API called");
  
  try {
    const { searchParams } = new URL(request.url);
    
    // Support both 'search' and 'q' parameters for compatibility
    const searchQuery = searchParams.get('search') || searchParams.get('q') || '';
    const category = searchParams.get('category');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Properly parse price filters, checking for invalid values
    let minPrice = null;
    if (searchParams.has('minPrice')) {
      const minPriceStr = searchParams.get('minPrice');
      if (minPriceStr && minPriceStr !== 'undefined' && minPriceStr !== 'null') {
        minPrice = parseFloat(minPriceStr);
        if (isNaN(minPrice)) minPrice = null;
      }
    }
    
    let maxPrice = null;
    if (searchParams.has('maxPrice')) {
      const maxPriceStr = searchParams.get('maxPrice');
      if (maxPriceStr && maxPriceStr !== 'undefined' && maxPriceStr !== 'null') {
        maxPrice = parseFloat(maxPriceStr);
        if (isNaN(maxPrice)) maxPrice = null;
      }
    }
    
    // Location parameters - also validate to avoid invalid values
    let latitude = null;
    let longitude = null;
    let radius = 3; // Default 3km radius
    
    if (searchParams.has('latitude') && searchParams.has('longitude')) {
      const latStr = searchParams.get('latitude');
      const lonStr = searchParams.get('longitude');
      
      if (latStr && lonStr && latStr !== 'undefined' && lonStr !== 'undefined') {
        latitude = parseFloat(latStr);
        longitude = parseFloat(lonStr);
        
        // Ensure they're valid coordinates
        if (isNaN(latitude) || isNaN(longitude)) {
          latitude = null;
          longitude = null;
        }
      }
      
      if (searchParams.has('radius')) {
        const radiusStr = searchParams.get('radius');
        if (radiusStr && radiusStr !== 'undefined') {
          const parsedRadius = parseFloat(radiusStr);
          if (!isNaN(parsedRadius) && parsedRadius > 0) {
            radius = parsedRadius;
          }
        }
      }
    }
    
    const hasLocationFilter = latitude !== null && longitude !== null;
    
    console.log(`Search API params: searchQuery="${searchQuery}", category=${category}, page=${page}, limit=${limit}`);
    if (hasLocationFilter) {
      console.log(`Location filter: lat=${latitude}, lon=${longitude}, radius=${radius}km`);
    } else {
      console.log('No location filter applied');
    }
    
    // Log all search parameters for debugging
    console.log('All search parameters:', Object.fromEntries([...searchParams.entries()]));
    
    // Make search query optional to support browsing by category
    if (!searchQuery.trim() && !category && !hasLocationFilter) {
      return NextResponse.json(
        { error: 'Either search query, category, or location parameters are required' },
        { status: 400 }
      );
    }
    
    // Create a cache key from the request parameters
    const cacheKey = JSON.stringify({
      searchQuery,
      category,
      page,
      limit,
      minPrice,
      maxPrice,
      latitude,
      longitude,
      radius
    });
    
    // Check if we have a cached result
    const cachedResult = searchCache.get(cacheKey);
    if (cachedResult && (Date.now() - cachedResult.timestamp < CACHE_TTL)) {
      console.log(`Using cached result for "${searchQuery || category}"`);
      return NextResponse.json(cachedResult.data);
    }
    
    // STEP 1: First, get ALL products matching the search query or category
    // We'll filter by location afterwards for better performance
    const searchStep = async () => {
      console.log("Step 1: Finding products matching search criteria");
      
      // Build the search criteria without location filter
      let productSearchClause = {
        isActive: true,
      };
      
      // Add search conditions if searchQuery is provided
      if (searchQuery && searchQuery.trim()) {
        // More extensive text search using OR conditions
        productSearchClause.OR = [
          { name: { contains: searchQuery.trim(), mode: 'insensitive' } },
          { description: { contains: searchQuery.trim(), mode: 'insensitive' } },
          { category: { contains: searchQuery.trim(), mode: 'insensitive' } }
        ];
      }
      
      // Add category filter if provided
      if (category) {
        productSearchClause.category = { 
          contains: category, 
          mode: 'insensitive' 
        };
      }
      
      // Add price filters if provided
      if (minPrice !== null && !isNaN(minPrice)) {
        productSearchClause.sellingPrice = { ...(productSearchClause.sellingPrice || {}), gte: minPrice };
      }
      
      if (maxPrice !== null && !isNaN(maxPrice)) {
        productSearchClause.sellingPrice = { ...(productSearchClause.sellingPrice || {}), lte: maxPrice };
      }
      
      console.log(`Product search clause: ${JSON.stringify(productSearchClause, null, 2)}`);
      
      // Find all matching products with their seller info
      // We need seller info to filter by location later
      try {
        const matchingProducts = await prisma.product.findMany({
          where: productSearchClause,
          include: {
            seller: {
              select: {
                id: true,
                shopName: true,
                city: true,
                state: true,
                latitude: true,
                longitude: true,
                isVisible: true, // Include visibility flag
              },
            }
          },
          orderBy: {
            createdAt: 'desc',
          },
        }).catch(err => {
          console.error('Error finding matching products:', err);
          return [];
        });
        
        console.log(`Found ${matchingProducts.length} products matching search criteria`);
        // Add detailed debug on first product to verify structure
        if (matchingProducts.length > 0) {
          console.log('First product sample structure:', {
            id: matchingProducts[0].id,
            name: matchingProducts[0].name,
            hasImages: Array.isArray(matchingProducts[0].images) && matchingProducts[0].images.length > 0,
            sellerIsVisible: matchingProducts[0].seller?.isVisible
          });
        }
        return matchingProducts;
      } catch (error) {
        console.error('Error in searchStep:', error);
        return [];
      }
    };
    
    // STEP 2: Filter products by seller visibility and location if needed
    const filterStep = async (allProducts) => {
      console.log("Step 2: Filtering products by seller visibility and location");
      
      if (!Array.isArray(allProducts)) {
        console.error('Expected array of products but got:', typeof allProducts);
        return [];
      }
      
      // First filter by seller visibility
      let visibleProducts = allProducts.filter(product => 
        product.seller && product.seller.isVisible === true
      );
      
      console.log(`After visibility filter: ${visibleProducts.length} products`);
      
      // Then filter by location if location filter is enabled
      if (hasLocationFilter) {
        const productsWithDistance = visibleProducts.map(product => {
          try {
            const seller = product.seller;
            let distance = null;
            
            if (seller && seller.latitude && seller.longitude && 
                !isNaN(seller.latitude) && !isNaN(seller.longitude)) {
              distance = calculateDistance(
                latitude, longitude,
                seller.latitude, seller.longitude
              );
            }
            
            return {
              ...product,
              distance: distance !== null ? parseFloat(distance.toFixed(1)) : null
            };
          } catch (err) {
            console.error('Error adding distance to product:', product.id, err);
            return {
              ...product,
              distance: null
            };
          }
        });
        
        // Filter products by distance
        const nearbyProducts = productsWithDistance.filter(product => {
          // Only include products within the specified radius
          return product.distance !== null && product.distance <= radius;
        });
        
        console.log(`After location filter: ${nearbyProducts.length} products within ${radius}km`);
        
        // Sort by distance
        nearbyProducts.sort((a, b) => {
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
        
        return nearbyProducts;
      }
      
      return visibleProducts;
    };
    
    // STEP 3: Apply pagination
    const paginateResults = (filteredProducts) => {
      console.log("Step 3: Paginating results");
      
      const totalCount = filteredProducts.length;
      const totalPages = Math.ceil(totalCount / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      // Slice the array for pagination
      const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
      
      console.log(`Pagination: page ${page} of ${totalPages}, showing ${paginatedProducts.length} products`);
      
      return {
        products: paginatedProducts,
        totalProducts: totalCount,
        totalPages,
        currentPage: page
      };
    };
    
    // Execute the search and filtering pipeline
    try {
      // Step 1: Get all matching products
      const allMatchingProducts = await searchStep();
      
      // Step 2: Filter by seller visibility and location
      const filteredProducts = await filterStep(allMatchingProducts);
      
      // Step 3: Apply pagination
      const paginatedResults = paginateResults(filteredProducts);
      
      // Prepare the final response
      const responseData = {
        ...paginatedResults,
        query: searchQuery || '',
        category: category || '',
        isLocationFilter: hasLocationFilter
      };
      
      // Add additional verification to ensure products have necessary fields
      if (responseData.products && responseData.products.length > 0) {
        // Ensure every product has basic properties set
        responseData.products = responseData.products.map(product => {
          // Make sure each product has required fields with default values
          return {
            ...product,
            id: product.id,
            name: product.name || 'Unnamed Product',
            sellingPrice: product.sellingPrice || 0,
            mrpPrice: product.mrpPrice || 0,
            category: product.category || 'General',
            // Make sure images is always an array
            images: Array.isArray(product.images) ? 
              product.images.filter(img => img && typeof img === 'string') : 
              []
          };
        });
        
        // Verify first product has all required fields
        const sampleProduct = responseData.products[0];
        console.log('Sample product in final response:', {
          id: sampleProduct.id,
          name: sampleProduct.name,
          hasImages: Array.isArray(sampleProduct.images) && sampleProduct.images.length > 0,
          hasPrice: sampleProduct.sellingPrice !== undefined || sampleProduct.mrpPrice !== undefined,
          imageCount: Array.isArray(sampleProduct.images) ? sampleProduct.images.length : 0
        });
      }
      
      // Ensure we return full product objects instead of abbreviated ones
      if (responseData.products && responseData.products.length > 0) {
        responseData.products = responseData.products.map(product => {
          // Extract seller data while removing sensitive fields
          const { seller, ...productData } = product;
          
          // Get important seller info without sensitive data
          const sellerInfo = seller ? {
            sellerId: seller.id,
            shopName: seller.shopName || 'Unknown Shop',
            city: seller.city,
            state: seller.state,
            // Include distance if available
            ...(product.distance !== undefined ? { distance: product.distance } : {})
          } : null;
          
          // Return a clean product object with all required fields
          return {
            ...productData,
            // Add back the seller info we want to keep
            seller: sellerInfo,
            // Ensure these critical fields are always present with fallbacks
            id: productData.id,
            name: productData.name || 'Unnamed Product',
            description: productData.description || '',
            sellingPrice: typeof productData.sellingPrice === 'number' ? productData.sellingPrice : 0,
            mrpPrice: typeof productData.mrpPrice === 'number' ? productData.mrpPrice : 0,
            discountPercentage: productData.mrpPrice && productData.sellingPrice
              ? Math.round(100 - ((productData.sellingPrice / productData.mrpPrice) * 100))
              : 0,
            category: productData.category || 'General',
            subcategory: productData.subcategory || '',
            // Ensure images is always a valid array of URLs
            images: Array.isArray(productData.images) 
              ? productData.images.filter(img => img && typeof img === 'string')
              : [],
            // Include any other fields needed by ProductCard
            sizeQuantities: productData.sizeQuantities || {},
            isActive: productData.isActive !== false, // Default to true if undefined
            createdAt: productData.createdAt || new Date().toISOString(),
          };
        });
        
        // Debug log the first product after transformation
        console.log('Transformed first product:', JSON.stringify(responseData.products[0], null, 2).substring(0, 500) + '...');
      }
      
      // Cache the result
      searchCache.set(cacheKey, {
        data: responseData,
        timestamp: Date.now()
      });
      
      // Clean up old cache entries
      cleanupCache();
      
      console.log(`Search complete: returning ${paginatedResults.products.length} results`);
      return NextResponse.json(responseData);
      
    } catch (error) {
      console.error(`Error executing search pipeline:`, error);
      
      // Return a more generic error to avoid leaking details in production
      return NextResponse.json(
        { 
          error: 'Failed to search products. Please try again.', 
          message: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error(`Fatal error in search API:`, error);
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred', 
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Helper function to clean up expired cache entries
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of searchCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      searchCache.delete(key);
    }
  }
} 