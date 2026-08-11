-- Align ExamCalendarSession.paperSource enum with Prisma schema (ExamSchedulePaperSource).
-- Some environments created ExamPaperPickSource; production may already use ExamSchedulePaperSource.

DO $$
BEGIN
  -- If only the old name exists, rename it to the canonical name.
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExamPaperPickSource')
     AND NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExamSchedulePaperSource') THEN
    ALTER TYPE "ExamPaperPickSource" RENAME TO "ExamSchedulePaperSource";
  END IF;

  -- If only the canonical name is missing, create it.
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExamSchedulePaperSource') THEN
    CREATE TYPE "ExamSchedulePaperSource" AS ENUM ('QUESTION_BANK', 'PAPER_UPLOAD', 'NONE');
  END IF;

  -- If both exist, move the column onto ExamSchedulePaperSource and drop the old type when safe.
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExamPaperPickSource')
     AND EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ExamSchedulePaperSource') THEN
    IF EXISTS (
      SELECT 1
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_type t ON t.oid = a.atttypid
      WHERE c.relname = 'ExamCalendarSession'
        AND a.attname = 'paperSource'
        AND NOT a.attisdropped
        AND t.typname = 'ExamPaperPickSource'
    ) THEN
      ALTER TABLE "ExamCalendarSession" ALTER COLUMN "paperSource" DROP DEFAULT;
      ALTER TABLE "ExamCalendarSession"
        ALTER COLUMN "paperSource" TYPE "ExamSchedulePaperSource"
        USING ("paperSource"::text::"ExamSchedulePaperSource");
      ALTER TABLE "ExamCalendarSession"
        ALTER COLUMN "paperSource" SET DEFAULT 'NONE'::"ExamSchedulePaperSource";
    END IF;

    BEGIN
      DROP TYPE "ExamPaperPickSource";
    EXCEPTION
      WHEN dependent_objects_still_exist THEN NULL;
      WHEN undefined_object THEN NULL;
    END;
  END IF;

  -- Ensure column exists with canonical type.
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'ExamCalendarSession' AND column_name = 'paperSource'
  ) THEN
    ALTER TABLE "ExamCalendarSession"
      ADD COLUMN "paperSource" "ExamSchedulePaperSource" NOT NULL DEFAULT 'NONE';
  END IF;
END $$;
