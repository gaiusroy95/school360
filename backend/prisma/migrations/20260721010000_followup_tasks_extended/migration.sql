-- CreateEnum
CREATE TYPE "FollowUpMode" AS ENUM ('PHONE', 'CAMPUS_VISIT', 'VIDEO_CALL', 'EMAIL', 'IN_PERSON_COUNSELLING');

-- AlterTable
ALTER TABLE "FollowUpTask" ADD COLUMN "mode" "FollowUpMode" NOT NULL DEFAULT 'PHONE';
ALTER TABLE "FollowUpTask" ADD COLUMN "subject" TEXT NOT NULL DEFAULT '';
ALTER TABLE "FollowUpTask" ADD COLUMN "discussionNotes" TEXT;

-- CreateIndex
CREATE INDEX "FollowUpTask_mode_status_idx" ON "FollowUpTask"("mode", "status");
