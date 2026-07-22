-- AlterTable
ALTER TABLE "ParentMeeting" ADD COLUMN "batchId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ParentMeeting" ADD COLUMN "meetingTitle" TEXT NOT NULL DEFAULT 'Parent Teacher Meeting';
ALTER TABLE "ParentMeeting" ADD COLUMN "venue" TEXT NOT NULL DEFAULT '';
