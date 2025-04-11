/**
 * Notification Service - Handles communications via WhatsApp through Gupshup templates
 */
import axios from 'axios';

// Template IDs for different notification types
const TEMPLATES = {
  CUSTOMER_ORDER_CANCELLED_REFUND: 'customer_order_cancelled_refund',
  ADMIN_ORDER_PENDING_SELLER: 'admin_order_pending_seller',
  SELLER_ORDER_WITH_IMAGE: 'seller_order_with_image'
};

/**
 * Send a WhatsApp notification using a Gupshup template
 * @param {string} templateName - Template name/id from the TEMPLATES object
 * @param {string} phoneNumber - Recipient phone number in E.164 format (e.g. 916301658275)
 * @param {Object} params - Parameters to fill in the template
 * @returns {Promise<Object>} Response from the Gupshup API
 */
async function sendTemplateNotification(templateName, phoneNumber, params) {
  try {
    // Validate parameters
    if (!templateName || !phoneNumber) {
      console.error('Missing required parameters for notification');
      throw new Error('Missing required parameters');
    }

    // Format destination phone number (remove + if present)
    const destination = phoneNumber.startsWith('+') ? phoneNumber.substring(1) : phoneNumber;

    // Get Gupshup API details from environment variables
    const API_KEY = process.env.GUPSHUP_API_KEY;
    const SOURCE_NUMBER = process.env.GUPSHUP_SOURCE_NUMBER;
    const SRC_NAME = process.env.GUPSHUP_SRC_NAME;
    const GUPSHUP_API_URL = process.env.GUPSHUP_API_URL;

    // Check if Gupshup credentials are present
    if (!API_KEY || !SOURCE_NUMBER || !GUPSHUP_API_URL) {
      console.log('Gupshup credentials missing, cannot send notification');
      throw new Error('Gupshup credentials missing');
    }

    // Prepare the request body
    const requestBody = new URLSearchParams();
    requestBody.append('source', SOURCE_NUMBER);
    if (SRC_NAME) {
      requestBody.append('source.name', SRC_NAME);
    }
    requestBody.append('destination', destination);
    
    // Convert params array to include only values for template parameters
    const templateParams = Object.values(params);
    
    const templateData = JSON.stringify({
      id: templateName,
      params: templateParams
    });
    
    requestBody.append('template', templateData);

    console.log('Sending template notification:', {
      template: templateName,
      destination,
      params: templateParams
    });

    // Call the Gupshup API
    const response = await axios.post(
      GUPSHUP_API_URL,
      requestBody,
      {
        headers: {
          'Cache-Control': 'no-cache',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Apikey': API_KEY
        }
      }
    );

    console.log('Gupshup API response status:', response.status);

    if (response.status >= 200 && response.status < 300) {
      return {
        success: true,
        message: 'Notification sent successfully',
        data: response.data
      };
    } else {
      console.error('Gupshup API returned non-success status:', response.status);
      console.error('Gupshup API response data:', response.data);
      
      return {
        success: false,
        message: 'Failed to send notification',
        error: response.data || 'Unknown API error'
      };
    }
  } catch (error) {
    console.error('Error sending template notification:', error.message);
    console.error('Error details:', error.response?.data || 'No response data');
    
    return {
      success: false,
      message: 'Error sending notification',
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Send customer order cancelled notification with refund information
 * @param {string} customerPhone - Customer phone number
 * @param {Object} orderData - Order data with name, orderId, reason, refundAmount
 * @returns {Promise<Object>} Response from notification service
 */
export async function sendCustomerOrderCancelledRefund(customerPhone, orderData) {
  const { customerName, orderId, reason, refundAmount } = orderData;
  
  return sendTemplateNotification(
    TEMPLATES.CUSTOMER_ORDER_CANCELLED_REFUND,
    customerPhone,
    { 
      customerName, // {{1}}
      orderId,      // {{2}}
      reason,       // {{3}}
      refundAmount  // {{4}}
    }
  );
}

/**
 * Send admin notification for an order pending seller action
 * @param {string} adminPhone - Admin phone number
 * @param {Object} orderData - Order data with orderId, amount, customerName, phone, shippingAddress
 * @returns {Promise<Object>} Response from notification service
 */
export async function sendAdminOrderPendingSeller(adminPhone, orderData) {
  const { orderId, amount, customerName, customerPhone, shippingAddress } = orderData;
  
  return sendTemplateNotification(
    TEMPLATES.ADMIN_ORDER_PENDING_SELLER,
    adminPhone,
    {
      orderId,         // {{1}}
      amount,          // {{2}}
      customerName,    // {{3}}
      customerPhone,   // {{4}}
      shippingAddress  // {{5}}
    }
  );
}

/**
 * Send seller new order notification with product image
 * @param {string} sellerPhone - Seller phone number
 * @param {Object} orderData - Order data with orderId, items, shippingAddress
 * @returns {Promise<Object>} Response from notification service
 */
export async function sendSellerOrderWithImage(sellerPhone, orderData) {
  const { orderId, items, shippingAddress } = orderData;
  
  // Format items object/array into a string for the template
  const formattedItems = Array.isArray(items) 
    ? items.join(', ') 
    : JSON.stringify(items);
  
  return sendTemplateNotification(
    TEMPLATES.SELLER_ORDER_WITH_IMAGE,
    sellerPhone,
    {
      orderId,          // {{1}}
      formattedItems,   // {{2}}
      shippingAddress   // {{3}}
    }
  );
}

// Export constants and functions
export { TEMPLATES }; 