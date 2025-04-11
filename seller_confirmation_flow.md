# Seller Order Confirmation Flow

This document outlines the sequence of events for processing an order with seller confirmation via WhatsApp after successful customer payment.

## Requirements Summary

*   5 Approved Gupshup Templates (Seller Interactive, Admin Pending, Admin Final, Customer Confirmed, Customer Cancelled)
*   Modified Cashfree Webhook Handler API Route
*   New Gupshup Reply Handler API Route
*   Database schema updates (Order Status, Seller Reply Deadline)
*   Seller & Customer Phone Numbers in DB
*   Cashfree Refund API Integration
*   Background Job Runner (for timeouts)
*   Updated Environment Variables (Template IDs, Admin Phone)
*   Gupshup App configuration pointing to Reply Handler URL

## Workflow Diagram

```mermaid
sequenceDiagram
    participant Customer
    participant Browser
    participant AzureFrontend as Azure FE (Next.js)
    participant AzurePaymentAPI as Azure API (Payment)
    participant AzureWebhookAPI as Azure API (Webhook)
    participant AzureGupshupReplyAPI as Azure API (Gupshup Reply)
    participant AzureBackgroundJob as Azure BG Job
    participant Cashfree
    participant Gupshup
    participant Database as DB
    participant SellerPhone as Seller WA
    participant AdminPhone as Admin WA

    Note over Customer, Cashfree: Customer completes payment
    Customer->>Browser: Submit Payment Info
    Browser->>AzurePaymentAPI: Initiate Payment (e.g., /api/create-payment-order)
    AzurePaymentAPI->>Cashfree: Create Order
    Cashfree-->>AzurePaymentAPI: Payment Session ID
    AzurePaymentAPI-->>Browser: Redirect to Cashfree
    Browser->>Cashfree: User Pays
    Cashfree-->>Browser: Redirect User back to /payment-status
    Browser->>AzureFE: Load /payment-status page
    AzureFE->>AzureWebhookAPI: Verify Payment (via /api/verify-payment - initial check)
    AzureWebhookAPI-->>AzureFE: Returns status (e.g., PAID or PENDING)
    Note over Browser: Display initial status (e.g., "Payment Successful, awaiting seller...")

    par Cashfree Webhook Processing
        Cashfree->>AzureWebhookAPI: Send Payment Success Webhook
        AzureWebhookAPI->>AzureWebhookAPI: Verify Webhook Signature
        AzureWebhookAPI->>DB: Fetch Order & Line Items (inc. SellerIDs)
        AzureWebhookAPI->>DB: Update Order Status to 'PENDING_SELLER_ACCEPTANCE'
        AzureWebhookAPI->>DB: Set sellerReplyDeadline (NOW + 3 mins)
        AzureWebhookAPI->>Gupshup: Send Seller Interactive Template (to Seller WA)
        AzureWebhookAPI->>Gupshup: Send Admin Pending Template (to Admin WA)
    end

    alt Seller Responds within 3 mins
        SellerWA->>Gupshup: Taps 'Accept' or 'Reject' button
        Gupshup->>AzureGupshupReplyAPI: Forward Seller Reply
        AzureGupshupReplyAPI->>DB: Get Order by ID/Phone
        alt Seller Accepts
            AzureGupshupReplyAPI->>DB: Update Order Status to 'CONFIRMED_BY_SELLER'
            AzureGupshupReplyAPI->>Gupshup: Send Customer Confirmed Template (to Customer)
            AzureGupshupReplyAPI->>Gupshup: Send Admin Final Status (Accepted) (to Admin WA)
        else Seller Rejects
            AzureGupshupReplyAPI->>DB: Update Order Status to 'REJECTED_BY_SELLER'
            AzureGupshupReplyAPI->>Cashfree: Initiate Refund
            AzureGupshupReplyAPI->>Gupshup: Send Customer Cancelled Template (to Customer)
            AzureGupshupReplyAPI->>Gupshup: Send Admin Final Status (Rejected) (to Admin WA)
        end
    else Timeout (After 3 mins)
        loop Check Pending Orders Periodically
            AzureBackgroundJob->>DB: Find Orders where status='PENDING_SELLER_ACCEPTANCE' AND sellerReplyDeadline < NOW
        end
        Note over AzureBackgroundJob: Found timed-out order
        AzureBackgroundJob->>DB: Update Order Status to 'CANCELLED_TIMEOUT'
        AzureBackgroundJob->>Cashfree: Initiate Refund
        AzureBackgroundJob->>Gupshup: Send Customer Cancelled Template (to Customer)
        AzureBackgroundJob->>Gupshup: Send Admin Final Status (Timeout) (to Admin WA)
    end

```

*Note: Error handling and detailed logic within each step are simplified for clarity.* 