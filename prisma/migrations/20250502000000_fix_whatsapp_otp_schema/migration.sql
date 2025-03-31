-- AlterTable for WhatsAppOTP to add @updatedAt functionality
-- This won't modify the existing column but adds the trigger for automatic updates

-- First, create a function to automatically update the updatedAt timestamp
CREATE OR REPLACE FUNCTION update_modified_column() RETURNS TRIGGER AS $$ 
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- If the trigger already exists, drop it first to avoid errors
DROP TRIGGER IF EXISTS set_whatsapp_otp_timestamp ON "WhatsAppOTP";

-- Create a trigger to automatically update the updatedAt field
CREATE TRIGGER set_whatsapp_otp_timestamp
BEFORE UPDATE ON "WhatsAppOTP"
FOR EACH ROW
EXECUTE FUNCTION update_modified_column(); 