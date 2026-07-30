-- AlterTable
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "softId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "srNo" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "portalNicCode" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE IF NOT EXISTS "soft_id_seq" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT 'SCH',
    "nextNumber" INTEGER NOT NULL DEFAULT 1,
    "padLength" INTEGER NOT NULL DEFAULT 4,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "soft_id_seq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "soft_id_seq_institutionId_key" ON "soft_id_seq"("institutionId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Student_institutionId_softId_idx" ON "Student"("institutionId", "softId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "soft_id_seq" ADD CONSTRAINT "soft_id_seq_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
