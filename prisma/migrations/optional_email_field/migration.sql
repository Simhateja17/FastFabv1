-- Make email field optional in User table
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL; 