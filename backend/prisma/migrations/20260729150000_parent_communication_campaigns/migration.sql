CREATE TYPE "ParentCommunicationCampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "ParentCommunicationDeliveryMode" AS ENUM ('DRAFT', 'SEND_NOW', 'SCHEDULED', 'RECURRING');
CREATE TYPE "ParentCommunicationRecurrence" AS ENUM ('NONE', 'WEEKLY', 'MONTHLY', 'DAY_15');

CREATE TABLE "ParentCommunicationCampaign" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "campaignCode" TEXT NOT NULL,
    "channel" "ParentCommunicationChannel" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "audienceBatches" JSONB NOT NULL DEFAULT '[]',
    "deliveryMode" "ParentCommunicationDeliveryMode" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "recurrenceType" "ParentCommunicationRecurrence" NOT NULL DEFAULT 'NONE',
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "status" "ParentCommunicationCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentCommunicationCampaign_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ParentCommunicationCampaign_institutionId_campaignCode_key" ON "ParentCommunicationCampaign"("institutionId", "campaignCode");
CREATE INDEX "ParentCommunicationCampaign_institutionId_status_idx" ON "ParentCommunicationCampaign"("institutionId", "status");
CREATE INDEX "ParentCommunicationCampaign_institutionId_nextRunAt_idx" ON "ParentCommunicationCampaign"("institutionId", "nextRunAt");

ALTER TABLE "ParentCommunicationCampaign" ADD CONSTRAINT "ParentCommunicationCampaign_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
