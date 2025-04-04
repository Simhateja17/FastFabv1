-- Add default value generator to id in User table
ALTER TABLE "User" 
ALTER COLUMN "id" SET DEFAULT gen_random_uuid(); 