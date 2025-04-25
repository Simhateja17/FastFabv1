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
    let fullAddress = '';
    let city = '';
    let state = '';
    let pincode = '';
    
    // Handle different location data formats
    if (typeof locationData === 'string') {
      // Try to parse from a string
      fullAddress = locationData;
      
      // Attempt to extract components from string
      const parts = locationData.split(',').map(part => part.trim());
      if (parts.length >= 1) fullAddress = parts.slice(0, parts.length - 2).join(', ');
      if (parts.length >= 2) city = parts[parts.length - 2].replace(/\d+/g, '').trim();
      if (parts.length >= 3) state = parts[parts.length - 1].replace(/\d+/g, '').trim();
      
      // Try to extract pincode
      const pincodeMatch = locationData.match(/\b\d{6}\b/);
      if (pincodeMatch) pincode = pincodeMatch[0];
    } 
    else if (locationData.formatted_address) {
      // Google Places API format
      fullAddress = locationData.formatted_address;
      
      // Extract from address_components if available
      if (locationData.address_components) {
        for (const component of locationData.address_components) {
          if (component.types.includes('locality')) {
            city = component.long_name;
          } else if (component.types.includes('administrative_area_level_1')) {
            state = component.long_name;
          } else if (component.types.includes('postal_code')) {
            pincode = component.long_name;
          }
        }
      } else {
        // Fallback extraction from formatted address
        const parts = fullAddress.split(',').map(part => part.trim());
        
        // Extract city, state, pincode from the formatted address
        if (parts.length >= 2) city = parts[parts.length - 3] || '';
        if (parts.length >= 1) state = parts[parts.length - 2] || '';
        
        const pincodeMatch = fullAddress.match(/\b\d{6}\b/);
        if (pincodeMatch) pincode = pincodeMatch[0];
      }
      
      // Extract street address for line1 (remove city, state, pincode parts)
      const addressParts = fullAddress.split(',');
      if (addressParts.length > 2) {
        fullAddress = addressParts.slice(0, -2).join(',').trim();
      }
    } 
    else {
      // Handle other location data structures
      fullAddress = locationData.label || locationData.address || '';
      city = locationData.city || locationData.locality || '';
      state = locationData.state || locationData.administrative_area || '';
      pincode = locationData.pincode || locationData.postal_code || locationData.postcode || '';
      
      // If we have a full description but not individual parts, try to extract them
      if (locationData.description && (!city || !state || !pincode)) {
        const parts = locationData.description.split(',').map(part => part.trim());
        if (parts.length >= 3) {
          if (!city) city = parts[parts.length - 3] || '';
          if (!state) state = parts[parts.length - 2] || '';
          
          const pincodeMatch = locationData.description.match(/\b\d{6}\b/);
          if (pincodeMatch && !pincode) pincode = pincodeMatch[0];
        }
      }
    }
    
    // Make sure we have values for all fields, use fallbacks if needed
    if (!fullAddress) fullAddress = 'Address line';
    if (!city) city = 'City';
    if (!state) state = 'State';
    if (!pincode) pincode = '000000';
    
    console.log('Parsed address components:', { 
      fullAddress, 
      city, 
      state, 
      pincode,
      original: locationData
    });
    
    const addressData = {
      name: userData.name || 'Customer',
      phone: userData.phone || '',
      line1: fullAddress, // Use full detailed address for line1
      line2: '',
      city: city,
      state: state,
      pincode: pincode,
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