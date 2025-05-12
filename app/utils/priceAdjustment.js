/**
 * Utility functions for price adjustment with MRP enforcement
 */

/**
 * Calculate the adjusted price ensuring it doesn't exceed MRP
 * 
 * @param {number} currentPrice - The current selling price
 * @param {number} mrpPrice - The MRP (Maximum Retail Price)
 * @param {number} adjustmentValue - The adjustment amount
 * @param {string} adjustmentType - 'percentage' or 'fixed'
 * @param {string} adjustmentDirection - 'increase' or 'decrease'
 * @param {number|null} maxAdjustment - Maximum adjustment amount (optional)
 * @returns {number} The adjusted price, capped at MRP
 */
export const calculateAdjustedPrice = (
  currentPrice,
  mrpPrice,
  adjustmentValue,
  adjustmentType,
  adjustmentDirection,
  maxAdjustment = null
) => {
  if (!currentPrice || isNaN(adjustmentValue)) return currentPrice;
  
  const value = parseFloat(adjustmentValue);
  const direction = adjustmentDirection === 'increase' ? 1 : -1;
  let adjustment = 0;
  
  // Calculate adjustment based on type
  if (adjustmentType === 'percentage') {
    adjustment = (currentPrice * value * direction) / 100;
  } else {
    adjustment = value * direction;
  }
  
  // Apply max adjustment cap if specified
  if (maxAdjustment && !isNaN(maxAdjustment) && Math.abs(adjustment) > parseFloat(maxAdjustment)) {
    adjustment = parseFloat(maxAdjustment) * (direction > 0 ? 1 : -1);
  }
  
  // Calculate new price
  const newPrice = currentPrice + adjustment;
  
  // Ensure price doesn't go below 1
  const minPrice = 1;
  
  // Ensure price doesn't exceed MRP
  if (mrpPrice && newPrice > mrpPrice) {
    return mrpPrice;
  }
  
  return Math.max(minPrice, newPrice);
};

/**
 * Process products with MRP-enforced price adjustments
 * 
 * @param {Array} products - Array of product objects
 * @param {Object} adjustmentParams - Price adjustment parameters
 * @returns {Array} Products with adjusted prices
 */
export const processProductsWithMrpEnforcement = (products, adjustmentParams) => {
  const {
    adjustmentType,
    adjustmentValue,
    adjustmentDirection,
    maxAdjustment,
  } = adjustmentParams;
  
  return products.map(product => {
    const newPrice = calculateAdjustedPrice(
      product.sellingPrice,
      product.mrpPrice,
      adjustmentValue,
      adjustmentType,
      adjustmentDirection,
      maxAdjustment
    );
    
    return {
      ...product,
      originalPrice: product.sellingPrice,
      sellingPrice: newPrice,
      priceAdjusted: newPrice !== product.sellingPrice
    };
  });
}; 