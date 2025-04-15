This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Admin-Focused Order Management

## Overview

The FastFab application now uses an admin-centered approach for order management. Instead of directly notifying sellers about new orders, the system notifies the admin, who then acts as an intermediary between customers and sellers.

## Order Flow

1. **Customer Places Order**: Customer selects items and completes payment
2. **Order Marked as Pending**: System marks order as pending and notifies the admin 
3. **Admin Contacts Seller**: Admin calls the seller to check item availability
4. **Admin Makes Decision**:
   - If items are available: Admin accepts the order, customer is notified about the confirmed order
   - If items are unavailable: Admin rejects the order, customer is notified and refunded if payment was made

## Admin Panel Features

The admin panel provides these order management features:

- **Order List**: View all orders with basic details and status
- **Order Details**: View complete information about order, customer, and seller
- **Seller Information**: Access seller contact details to communicate regarding orders
- **Admin Notes**: Add notes about communications with sellers/customers
- **Accept/Reject Actions**: Buttons to accept or reject orders after confirming with sellers

## Technical Implementation

This functionality is implemented through:

1. **Database Changes**:
   - Removed seller notification fields (sellerNotified, sellerResponseDeadline)
   - Added admin-focused fields (adminProcessed, adminNotes, sellerConfirmed)

2. **API Routes**:
   - `/api/admin/orders/[id]/accept` - Accept an order after confirming with seller
   - `/api/admin/orders/[id]/reject` - Reject an order when items are unavailable 
   - `/api/admin/orders/[id]/notes` - Save admin notes about the order

3. **Admin Interface**:
   - Enhanced order detail page with seller information
   - Added admin actions panel for pending orders
   - Implemented notes section for order communication records
