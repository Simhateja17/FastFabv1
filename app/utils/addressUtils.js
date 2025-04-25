import { v4 as uuidv4 } from 'uuid';

/**
 * Creates an address from location data
 * @param {Object} locationData - The location data (from map selection, etc)
 * @param {Object} userData - The current user data 
 * @returns {Promise<Object>} - The created address object with id
 */
export async function createAddressFromLocation(locationData, userData) {
  try {
    if (!locationData) {
      throw new Error('Location data is required');
    }
    
    if (!userData || !userData.id) {
      throw new Error('User data is required');
    }
    
    // Extract address details from location data
    const addressData = {
      name: userData.name || 'Customer',
      phone: userData.phone || '',
      // Try to extract address components from different possible location formats
      line1: locationData.label || locationData.address || locationData.formatted_address || 'Address line',
      line2: '',
      city: locationData.city || locationData.locality || 'City',
      state: locationData.state || locationData.administrative_area || 'State',
      pincode: locationData.pincode || locationData.postal_code || locationData.postcode || '000000',
      country: 'India',
      isDefault: false, // Don't set as default unless explicitly requested
      // Include geo coordinates if available
      latitude: locationData.latitude || locationData.lat,
      longitude: locationData.longitude || locationData.lng
    };
    
    console.log('Creating address with data:', addressData);
    
    // Send the request to create the address
    const response = await fetch('/api/user/address', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userData.token}`
      },
      credentials: 'include', // Include cookies for auth
      body: JSON.stringify(addressData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to create address');
    }
    
    const result = await response.json();
    console.log('Address created successfully:', result.data.address);
    
    return result.data.address;
  } catch (error) {
    console.error('Error creating address:', error);
    throw error;
  }
}

/**
 * Ensures an order has a valid addressId by creating an address if needed
 * @param {Object} orderData - The order data to prepare
 * @param {Object} locationData - The location data to use if no addressId
 * @param {Object} userData - The current user data
 * @returns {Promise<Object>} - The updated order data with addressId
 */
export async function ensureOrderAddress(orderData, locationData, userData) {
  // If order already has an addressId, just return it
  if (orderData.addressId) {
    return orderData;
  }
  
  try {
    // Create a new address from the location data
    const address = await createAddressFromLocation(locationData, userData);
    
    // Return updated order data with the new addressId
    return {
      ...orderData,
      addressId: address.id
    };
  } catch (error) {
    console.error('Error ensuring order address:', error);
    throw error;
  }
} 