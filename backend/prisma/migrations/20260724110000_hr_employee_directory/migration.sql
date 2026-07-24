-- HR Employee Directory extended profile fields
ALTER TABLE "PayrollEmployee" ADD COLUMN IF NOT EXISTS "classGroup" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PayrollEmployee" ADD COLUMN IF NOT EXISTS "profileData" JSONB NOT NULL DEFAULT '{}';
