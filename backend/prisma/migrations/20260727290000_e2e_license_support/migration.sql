-- License Management & Support / Maintenance E2E

CREATE TABLE IF NOT EXISTS "system_licenses" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "edition" TEXT NOT NULL DEFAULT 'Enterprise',
    "licensedTo" TEXT NOT NULL DEFAULT '',
    "licenseKeyHash" TEXT NOT NULL DEFAULT '',
    "licenseKeyMasked" TEXT NOT NULL DEFAULT '',
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "maxUsers" INTEGER NOT NULL DEFAULT 500,
    "maxStudents" INTEGER NOT NULL DEFAULT 5000,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_licenses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "support_tickets" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reportedBy" TEXT NOT NULL DEFAULT '',
    "assignedTo" TEXT NOT NULL DEFAULT 'Support Team',
    "resolutionNotes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "system_licenses_institutionId_key" ON "system_licenses"("institutionId");
CREATE UNIQUE INDEX IF NOT EXISTS "support_tickets_institutionId_ticketNumber_key" ON "support_tickets"("institutionId", "ticketNumber");
CREATE INDEX IF NOT EXISTS "support_tickets_institutionId_status_createdAt_idx" ON "support_tickets"("institutionId", "status", "createdAt");

ALTER TABLE "system_licenses" ADD CONSTRAINT "system_licenses_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
