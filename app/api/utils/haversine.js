/**
 * Calculate the distance between two coordinates using the Haversine formula
 * Optimized for production reliability with better validation and error handling
 * 
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
  try {
    // Validate coordinates - check if they are defined and valid numbers
    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
      console.warn('Missing coordinates provided to haversineDistance:', { lat1, lon1, lat2, lon2 });
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
    
    // Check coordinate ranges
    if (Math.abs(lat1) > 90 || Math.abs(lat2) > 90 || Math.abs(lon1) > 180 || Math.abs(lon2) > 180) {
      console.warn('Coordinates out of valid range:', { lat1, lon1, lat2, lon2 });
      return null;
    }
    
    // Check if coordinates are the same (zero distance)
    if (lat1 === lat2 && lon1 === lon2) {
      return 0;
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
    const distance = Math.round(radius * c * 10) / 10;
    return distance;
  } catch (error) {
    console.error('Error calculating haversine distance:', error);
    return null;
  }
}

/**
 * Filter sellers based on distance from user coordinates
 * Enforces a strict 3km radius limit for business requirements
 * 
 * @param {Array} sellers - Array of seller objects with latitude and longitude
 * @param {number} userLat - User latitude
 * @param {number} userLon - User longitude
 * @param {number} radius - Maximum distance in kilometers (enforced max of 3km)
 * @returns {Array} Filtered array of sellers with distance
 */
export function findSellersInRadius(sellers, userLat, userLon, radius = 3) {
  try {
    // Validate inputs
    if (!Array.isArray(sellers)) {
      console.warn('Invalid sellers array provided to findSellersInRadius');
      return [];
    }
    
    if (!userLat || !userLon) {
      console.warn('Invalid user coordinates provided to findSellersInRadius:', { userLat, userLon });
      return [];
    }
    
    // Business rule: Enforce maximum radius of 3km
    const enforceRadius = Math.min(parseFloat(radius) || 3, 3);
    
    // Filter out sellers with invalid coordinates
    const validSellers = sellers.filter(
      seller => seller?.latitude && seller?.longitude && 
      !isNaN(parseFloat(seller.latitude)) && !isNaN(parseFloat(seller.longitude))
    );
    
    // Calculate distance for each seller
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
    
    // Strict filtering based on enforced radius with null safety
    const filteredSellers = sellersWithDistance
      .filter(seller => 
        seller.distance !== null && 
        typeof seller.distance === 'number' && 
        !isNaN(seller.distance) && 
        seller.distance <= enforceRadius
      )
      .sort((a, b) => a.distance - b.distance);
    
    return filteredSellers;
  } catch (error) {
    console.error('Error finding sellers in radius:', error);
    return [];
  }
}

/**
 * Get seller IDs within radius for database queries
 * @param {Object[]} sellersInRadius - Array of sellers within radius
 * @returns {string[]} - Array of seller IDs
 */
export function getSellerIdsInRadius(sellersInRadius) {
  if (!Array.isArray(sellersInRadius)) {
    return [];
  }
  return sellersInRadius.map(seller => seller.id).filter(Boolean);
}

/**
 * Check if user location is provided and valid
 * Utility function to standardize location validation across the app
 * 
 * @param {number} latitude - User latitude
 * @param {number} longitude - User longitude
 * @returns {boolean} Whether location is valid
 */
export function isValidLocation(latitude, longitude) {
  try {
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    
    return (
      !isNaN(lat) && 
      !isNaN(lon) && 
      Math.abs(lat) <= 90 && 
      Math.abs(lon) <= 180
    );
  } catch (e) {
    return false;
  }
} 