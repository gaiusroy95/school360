-- Parent engagement hierarchy + mobile roster linkage
ALTER TABLE "ParentEngagementEvent" ADD COLUMN IF NOT EXISTS "teacherName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ParentEngagementEvent" ADD COLUMN IF NOT EXISTS "className" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ParentEngagementEvent" ADD COLUMN IF NOT EXISTS "sectionName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ParentEngagementEvent" ADD COLUMN IF NOT EXISTS "academicYear" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ParentEngagementEvent" ADD COLUMN IF NOT EXISTS "rosterTaskId" TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS "ParentEngagementEvent_institutionId_teacherName_idx" ON "ParentEngagementEvent"("institutionId", "teacherName");
CREATE INDEX IF NOT EXISTS "ParentEngagementEvent_institutionId_class_section_idx" ON "ParentEngagementEvent"("institutionId", "className", "sectionName");
