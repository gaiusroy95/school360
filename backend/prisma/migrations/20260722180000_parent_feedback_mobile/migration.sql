-- AlterTable
ALTER TABLE "ParentFeedback" ADD COLUMN "parentMobile" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ParentFeedback" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MOBILE';
