-- Add JSON storage for custom fee heads beyond fixed columns
ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "extraHeads" JSONB NOT NULL DEFAULT '{}';
