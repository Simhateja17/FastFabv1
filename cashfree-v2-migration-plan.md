# Cashfree v2 API Migration Implementation Plan

## Overview
This document outlines the precise steps to migrate from Cashfree's deprecated v1/v1.2 APIs to their current v2 APIs. The migration will focus on updating the payment processing flow, particularly for withdrawals and UPI transfers.

## Prerequisites
- Access to both production and test/sandbox Cashfree accounts
- Development environment set up
- Access to all relevant codebase files
- Backup of current code in a separate branch

## Implementation Steps

### 1. Update Base URLs and Configuration
**Files to modify:** `payout.service.js`

```javascript
// Update base URLs
const baseUrl = Cashfree.XEnvironment === 'PRODUCTION' 
  ? 'https://api.cashfree.com/payout'
  : 'https://sandbox.cashfree.com/payout';

// Update environment variable references if needed
// Ensure CASHFREE_CLIENT_ID and CASHFREE_CLIENT_SECRET are properly set
```

### 2. Update Authorization Token Generation
**Files to modify:** `payout.service.js`

```javascript
const generateCashfreeAuthToken = async () => {
  console.log('[DEBUG] Generating new Cashfree authorization token');
  try {
    // Note: Auth endpoint still uses v1 path even in v2 API
    const response = await fetch(`${baseUrl}/v1/authorize`, {
      method: 'POST',
      headers: {
        'X-Client-Id': CASHFREE_CLIENT_ID,
        'X-Client-Secret': CASHFREE_CLIENT_SECRET,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    // Rest of function remains the same
  } catch (error) {
    // Error handling
  }
};
```

### 3. Implement Beneficiary Management Functions
**Files to modify:** `payout.service.js`

```javascript
/**
 * Create a new beneficiary in Cashfree
 */
const createBeneficiary = async (beneficiaryDetails) => {
  console.log('[DEBUG] Creating new beneficiary in Cashfree');
  try {
    const authToken = await getCashfreeAuthToken();
    
    const response = await fetch(`${baseUrl}/v2/beneficiary`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(beneficiaryDetails)
    });
    
    const data = await response.json();
    console.log('[DEBUG] Beneficiary creation response:', JSON.stringify(data));
    
    if (data.status !== 'SUCCESS') {
      throw new Error(`Failed to create beneficiary: ${data.message || 'Unknown error'}`);
    }
    
    return data.data;
  } catch (error) {
    console.error('[ERROR] Error creating beneficiary:', error);
    throw error;
  }
};

/**
 * Check if a beneficiary exists
 */
const getBeneficiary = async (beneId) => {
  console.log(`[DEBUG] Checking if beneficiary exists: ${beneId}`);
  try {
    const authToken = await getCashfreeAuthToken();
    
    const response = await fetch(`${baseUrl}/v2/beneficiary/${beneId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.status === 404 || data.status === 'ERROR') {
      console.log(`[DEBUG] Beneficiary not found: ${beneId}`);
      return null;
    }
    
    console.log('[DEBUG] Beneficiary found:', JSON.stringify(data.data));
    return data.data;
  } catch (error) {
    console.error('[ERROR] Error checking beneficiary:', error);
    return null;
  }
};
```

### 4. Create Beneficiary Helpers for Different Payment Methods
**Files to modify:** `payout.service.js`

```javascript
/**
 * Generate beneficiary details for UPI
 */
const generateUpiBeneficiary = (paymentDetails, sellerId) => {
  const beneId = `upi-${sellerId}-${Date.now()}`;
  return {
    beneId,
    name: paymentDetails.holderName || `Seller ${sellerId}`,
    email: paymentDetails.email || '',
    phone: paymentDetails.phone || '',
    bankAccount: {
      vpa: paymentDetails.upiId
    },
    address1: '',
    city: '',
    state: '',
    pincode: ''
  };
};

/**
 * Generate beneficiary details for bank account
 */
const generateBankBeneficiary = (paymentDetails, sellerId) => {
  const beneId = `bank-${sellerId}-${Date.now()}`;
  return {
    beneId,
    name: paymentDetails.accountHolderName,
    email: paymentDetails.email || '',
    phone: paymentDetails.phone || '',
    bankAccount: {
      accountNumber: paymentDetails.accountNumber,
      ifsc: paymentDetails.ifscCode
    },
    address1: '',
    city: '',
    state: '',
    pincode: ''
  };
};
```

### 5. Update UPI Transfer Implementation
**Files to modify:** `payout.service.js`

```javascript
const processUpiTransfer = async (transferDetails, withdrawalId, tx) => {
  console.log('[DEBUG] processUpiTransfer - Starting UPI transfer', { withdrawalId });
  
  try {
    // Validate UPI details
    if (!transferDetails.vpa) {
      console.error('[ERROR] processUpiTransfer - Invalid UPI details, missing UPI ID', transferDetails);
      throw new Error('Invalid UPI details: Missing UPI ID');
    }
    
    // Get auth token
    const authToken = await getCashfreeAuthToken();
    console.log('[DEBUG] processUpiTransfer - Auth token obtained');
    
    // 1. Create or get beneficiary first
    const sellerId = tx.id; // Assuming tx has sellerId
    const beneficiary = generateUpiBeneficiary({
      upiId: transferDetails.vpa,
      holderName: transferDetails.name || ''
    }, sellerId);
    
    await createBeneficiary(beneficiary);
    console.log('[DEBUG] processUpiTransfer - Beneficiary created with ID:', beneficiary.beneId);
    
    // 2. Now create the transfer with the beneficiary ID
    const transferParams = {
      transferId: transferDetails.transferId,
      transferAmount: {  // Note: changed from 'amount' to 'transferAmount'
        amount: transferDetails.amount,
        currency: "INR"
      },
      transferMode: "UPI",  // Note: now uppercase
      beneId: beneficiary.beneId,  // Use the beneficiary ID instead of direct details
      remarks: transferDetails.remarks || 'UPI Transfer Payout'
    };
    
    console.log('[DEBUG] processUpiTransfer - Calling Cashfree API with params:', JSON.stringify(transferParams, null, 2));
    
    // Make direct API call with auth token
    const response = await fetch(`${baseUrl}/v2/transfers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transferParams)
    });
    
    // Parse the response
    let cashfreeResponse;
    try {
      cashfreeResponse = await response.json();
    } catch (parseError) {
      console.error('[ERROR] processUpiTransfer - Failed to parse response:', parseError);
      const responseText = await response.text();
      console.error('[ERROR] Raw response:', responseText);
      throw new Error(`Failed to parse UPI transfer response: ${parseError.message}`);
    }
    
    console.log('[DEBUG] processUpiTransfer - Received response from Cashfree:', JSON.stringify(cashfreeResponse, null, 2));
    
    return handleCashfreeResponse(cashfreeResponse, 'UPI transfer');
  } catch (error) {
    console.error('[ERROR] processUpiTransfer - Processing error:', error);
    console.error('[ERROR] Stack trace:', error.stack);
    throw new Error(`UPI transfer failed: ${error.message}`);
  }
};
```

### 6. Update Bank Transfer Implementation
**Files to modify:** `payout.service.js`

```javascript
const processBankTransfer = async (transferDetails, withdrawalId, tx) => {
  console.log('[DEBUG] processBankTransfer - Starting bank transfer', { withdrawalId });
  
  try {
    // Validate bank transfer details
    if (!transferDetails.bankAccount || !transferDetails.ifsc || !transferDetails.name) {
      console.error('[ERROR] processBankTransfer - Invalid bank transfer details', transferDetails);
      throw new Error('Invalid bank transfer details');
    }
    
    // Get auth token
    const authToken = await getCashfreeAuthToken();
    console.log('[DEBUG] processBankTransfer - Auth token obtained');
    
    // 1. Create or get beneficiary first
    const sellerId = tx.id; // Assuming tx has sellerId
    const beneficiary = generateBankBeneficiary({
      accountNumber: transferDetails.bankAccount,
      ifscCode: transferDetails.ifsc,
      accountHolderName: transferDetails.name
    }, sellerId);
    
    await createBeneficiary(beneficiary);
    console.log('[DEBUG] processBankTransfer - Beneficiary created with ID:', beneficiary.beneId);
    
    // 2. Now create the transfer with the beneficiary ID
    const transferParams = {
      transferId: transferDetails.transferId,
      transferAmount: {  // Note: changed from 'amount' to 'transferAmount'
        amount: transferDetails.amount,
        currency: "INR"
      },
      transferMode: "BANK_ACCOUNT",  // Note: now uppercase with underscore
      beneId: beneficiary.beneId,  // Use the beneficiary ID instead of direct details
      remarks: transferDetails.remarks || 'Bank Transfer Payout'
    };
    
    console.log('[DEBUG] processBankTransfer - Calling Cashfree API with params:', JSON.stringify(transferParams, null, 2));
    
    // Make direct API call with auth token
    const response = await fetch(`${baseUrl}/v2/transfers`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(transferParams)
    });
    
    // Parse the response
    let cashfreeResponse;
    try {
      cashfreeResponse = await response.json();
    } catch (parseError) {
      console.error('[ERROR] processBankTransfer - Failed to parse response:', parseError);
      const responseText = await response.text();
      console.error('[ERROR] Raw response:', responseText);
      throw new Error(`Failed to parse bank transfer response: ${parseError.message}`);
    }
    
    console.log('[DEBUG] processBankTransfer - Received response from Cashfree:', JSON.stringify(cashfreeResponse, null, 2));
    
    return handleCashfreeResponse(cashfreeResponse, 'Bank transfer');
  } catch (error) {
    console.error('[ERROR] processBankTransfer - Processing error:', error);
    console.error('[ERROR] Stack trace:', error.stack);
    throw new Error(`Bank transfer failed: ${error.message}`);
  }
};
```

### 7. Update Response Handling
**Files to modify:** `payout.service.js`

```javascript
const handleCashfreeResponse = (response, operationType) => {
  console.log(`${operationType} response:`, JSON.stringify(response));
  
  // V2 API has different response structure
  if (response) {
    // Check for successful response
    // V2 API uses 'INITIATED' or 'PROCESSED' status for successful transfers
    if (response.status === 'SUCCESS' || 
        response.data?.status === 'INITIATED' || 
        response.data?.status === 'PROCESSED') {
      return {
        success: true,
        response: response,
        message: `${operationType} initiated successfully`,
        referenceId: response.data?.referenceId || 
                     response.data?.transferId || 
                     response.transferId
      };
    }
    
    // Handle pending status
    if (response.data?.status === 'PENDING' || 
        response.data?.status === 'ACCEPTED') {
      return {
        success: true,
        response: response,
        message: `${operationType} is pending processing`,
        referenceId: response.data?.referenceId || 
                     response.data?.transferId || 
                     response.transferId
      };
    }
  }
  
  // Error handling for various response patterns
  const errorMessage = response?.message || 
                       response?.reason || 
                       response?.data?.message || 
                       response?.error?.message || 
                       'Unknown error from payment gateway';
  
  const errorCode = response?.statusCode || 
                    response?.status || 
                    response?.data?.subCode || 
                    response?.error?.code || 
                    'UNKNOWN';
  
  console.error(`[ERROR] ${operationType} failed with code ${errorCode}: ${errorMessage}`);
  throw new Error(`${operationType} failed with code ${errorCode}: ${errorMessage}`);
};
```

### 8. Update Module Exports
**Files to modify:** `payout.service.js`

```javascript
module.exports = {
  handleWithdrawalRequest,
  validatePaymentDetails,
  processTransferByMethod,
  processBankTransfer,
  processUpiTransfer,
  processWalletTransfer,
  processCardTransfer,
  getCashfreeAuthToken,
  generateCashfreeAuthToken,
  createBeneficiary,
  getBeneficiary,
  generateUpiBeneficiary,
  generateBankBeneficiary
};
```

### 9. Update Transaction Status Checking
**Files to modify:** `payout.service.js`

```javascript
/**
 * Check transfer status
 */
const checkTransferStatus = async (transferId) => {
  console.log(`[DEBUG] Checking transfer status for: ${transferId}`);
  try {
    const authToken = await getCashfreeAuthToken();
    
    const response = await fetch(`${baseUrl}/v2/transfers/${transferId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log(`[DEBUG] Transfer status response: ${JSON.stringify(data)}`);
    
    if (data.status !== 'SUCCESS') {
      console.error(`[ERROR] Failed to get transfer status: ${data.message || 'Unknown error'}`);
      return null;
    }
    
    return data.data;
  } catch (error) {
    console.error('[ERROR] Error checking transfer status:', error);
    return null;
  }
};
```

### 10. Testing Plan

1. **Test in Sandbox Environment First**
   - Create test beneficiaries
   - Initiate small test transfers
   - Verify status checking

2. **Test Error Handling**
   - Test with invalid UPI IDs
   - Test with insufficient balance
   - Test with invalid beneficiary details

3. **Production Testing (After Sandbox Validation)**
   - Start with minimal amount transfers
   - Validate each transaction end-to-end
   - Monitor logs for any issues

### 11. Deployment Plan

1. **Rollout Strategy**
   - Deploy to development/test environment
   - Conduct thorough testing
   - Deploy to production during low-traffic period
   - Monitor closely for 24-48 hours

2. **Rollback Plan**
   - Keep backup of v1 implementation
   - Prepare quick rollback script if issues are detected
   - Have monitoring in place to detect any failures

## Timeline

- **Phase 1 (Day 1)**: Update base URLs and token generation
- **Phase 2 (Day 2)**: Implement beneficiary management functions
- **Phase 3 (Day 3)**: Update UPI and Bank transfer implementations
- **Phase 4 (Day 4)**: Update response handling and test in sandbox
- **Phase 5 (Day 5)**: Production deployment and monitoring

## Success Criteria

The migration will be considered successful when:
1. All withdrawal requests complete successfully
2. Response status and error codes are handled correctly
3. No 401 errors or deprecation warnings are received from Cashfree
4. Transaction monitoring and status checking work reliably 