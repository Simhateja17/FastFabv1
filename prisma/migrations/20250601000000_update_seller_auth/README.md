# Migration: Update Seller Authentication

This migration addresses GST validation requirements for seller onboarding.

## Changes:

1. Updated validation logic for GST number in the seller details API
2. Enhanced authentication handling to properly identify seller tokens from user tokens
3. Fixed Next.js dynamic route parameter handling in the seller details API

## No Schema Changes:

This migration does not alter the database schema. It only updates the application code to enforce GST validation during the seller onboarding process.

## Safety:

This migration is safe to apply as it:
- Does not cause any data loss
- Does not affect Google Maps functionality
- Improves seller onboarding by requiring GST number
- Does not affect WhatsApp OTP authentication 