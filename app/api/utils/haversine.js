/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  // Validate coordinates
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    console.warn('Invalid coordinates provided to haversineDistance:', { lat1, lon1, lat2, lon2 });
    return null;
  }
  
  // Parse coordinates to ensure they're numbers
  lat1 = parseFloat(lat1);
  lon1 = parseFloat(lon1);
  lat2 = parseFloat(lat2);
  lon2 = parseFloat(lon2);
  
  // Additional validation after parsing
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    console.warn('Coordinates could not be parsed to numbers:', { lat1, lon1, lat2, lon2 });
    return null;
  }
  
  // Convert latitude and longitude from degrees to radians
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const radius = 6371; // Earth's radius in kilometers
  
  // Distance in kilometers, rounded to 1 decimal place
  return Math.round(radius * c * 10) / 10;
}

/**
 * Filter sellers based on distance from user coordinates
 * @param {Array} sellers - Array of seller objects
 * @param {number} userLat - User latitude
 * @param {number} userLon - User longitude
 * @param {number} radius - Maximum distance in kilometers (enforced max of 3km)
 * @returns {Array} Filtered array of sellers with distance
 */
export function findSellersInRadius(sellers, userLat, userLon, radius = 3) {
  if (!Array.isArray(sellers) || !userLat || !userLon) {
    console.warn('Invalid parameters provided to findSellersInRadius:', { 
      sellersValid: Array.isArray(sellers), 
      userLat, 
      userLon 
    });
    return [];
  }
  
  // Business rule: Enforce maximum radius of 3km
  const enforceRadius = Math.min(parseFloat(radius) || 3, 3);
  console.log(`Enforcing maximum radius of ${enforceRadius}km (requested: ${radius}km)`);
  
  // Filter out sellers with invalid coordinates
  const validSellers = sellers.filter(
    seller => seller?.latitude && seller?.longitude && 
    !isNaN(parseFloat(seller.latitude)) && !isNaN(parseFloat(seller.longitude))
  );
  
  console.log(`${validSellers.length} out of ${sellers.length} sellers have valid coordinates`);
  
  // Calculate distance for each seller and filter by radius
  const sellersWithDistance = validSellers.map(seller => {
    const distance = haversineDistance(
      userLat,
      userLon,
      seller.latitude,
      seller.longitude
    );
    
    return {
      ...seller,
      distance
    };
  });
  
  // Strict filtering based on enforced radius
  const filteredSellers = sellersWithDistance
    .filter(seller => seller.distance !== null && seller.distance <= enforceRadius)
    .sort((a, b) => a.distance - b.distance);
  
  console.log(`Found ${filteredSellers.length} sellers within ${enforceRadius}km radius`);
  
  // Log first few sellers for debugging
  if (filteredSellers.length > 0) {
    console.log('Sample of sellers within radius:', 
      filteredSellers.slice(0, Math.min(5, filteredSellers.length))
        .map(s => ({ id: s.id, distance: s.distance }))
    );
  }
  
  return filteredSellers;
}

/**
 * Get seller IDs within radius for database queries
 * @param {Object[]} sellersInRadius - Array of sellers within radius
 * @returns {string[]} - Array of seller IDs
 */
export function getSellerIdsInRadius(sellersInRadius) {
  return sellersInRadius.map(seller => seller.id);
} 