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
    let cityValue = '';
    let stateValue = '';
    let pincodeValue = '';
    
    // Check if we have a formatted_address from Google Places API
    if (locationData.formatted_address) {
      fullAddress = locationData.formatted_address;
      
      // Try to extract components from address_components if available (Google Places format)
      if (locationData.address_components && Array.isArray(locationData.address_components)) {
        locationData.address_components.forEach(component => {
          if (component.types.includes('locality')) {
            cityValue = component.long_name;
          } else if (component.types.includes('administrative_area_level_1')) {
            stateValue = component.long_name;
          } else if (component.types.includes('postal_code')) {
            pincodeValue = component.long_name;
          }
        });
      }
    } else if (locationData.description) {
      // For autocomplete results
      fullAddress = locationData.description;
    } else if (locationData.label) {
      // Some map providers use label
      fullAddress = locationData.label;
    } else if (typeof locationData === 'string') {
      // If the location is just a string
      fullAddress = locationData;
    }
    
    // Extract city, state, pincode from the full address if not already extracted
    if (!cityValue || !stateValue || !pincodeValue) {
      // Try to extract from other fields if not in address_components
      cityValue = locationData.city || locationData.locality || '';
      stateValue = locationData.state || locationData.administrative_area || '';
      pincodeValue = locationData.pincode || locationData.postal_code || locationData.postcode || '';
      
      // Last attempt: try to extract from the full address string
      if (fullAddress) {
        // Try to extract pincode (6-digit number pattern common in India)
        const pincodeMatch = fullAddress.match(/\b\d{6}\b/);
        if (pincodeMatch && !pincodeValue) {
          pincodeValue = pincodeMatch[0];
        }
        
        // Common city names in India (add more as needed)
        const commonCities = ['Hyderabad', 'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Pune'];
        for (const city of commonCities) {
          if (fullAddress.includes(city) && !cityValue) {
            cityValue = city;
            break;
          }
        }
        
        // Common state names in India
        const commonStates = ['Telangana', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi'];
        for (const state of commonStates) {
          if (fullAddress.includes(state) && !stateValue) {
            stateValue = state;
            break;
          }
        }
      }
    }
    
    // Finalize the address object
    const addressData = {
      name: userData.name || 'Customer',
      phone: userData.phone || '',
      line1: fullAddress, // Use the full address for line1
      line2: '',
      city: cityValue || 'City', // Fallback to placeholders if not found
      state: stateValue || 'State',
      pincode: pincodeValue || '000000',
      country: 'India',
      isDefault: false,
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