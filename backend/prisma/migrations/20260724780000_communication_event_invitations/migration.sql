-- Event Invitations: RSVPs and automated reminders

CREATE TABLE "CommEventInvitation" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "eventType" TEXT NOT NULL DEFAULT 'OTHER',
    "venue" TEXT NOT NULL DEFAULT '',
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventTime" TEXT NOT NULL DEFAULT '',
    "rsvpDeadline" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "audienceType" TEXT NOT NULL DEFAULT 'ALL',
    "audienceLabel" TEXT NOT NULL DEFAULT '',
    "classFilter" TEXT NOT NULL DEFAULT '',
    "allowGuests" BOOLEAN NOT NULL DEFAULT false,
    "maxGuestsPerRsvp" INTEGER NOT NULL DEFAULT 2,
    "autoRemindEnabled" BOOLEAN NOT NULL DEFAULT true,
    "remindDaysBefore" INTEGER NOT NULL DEFAULT 3,
    "lastReminderAt" TIMESTAMP(3),
    "inviteCount" INTEGER NOT NULL DEFAULT 0,
    "rsvpYesCount" INTEGER NOT NULL DEFAULT 0,
    "rsvpNoCount" INTEGER NOT NULL DEFAULT 0,
    "rsvpMaybeCount" INTEGER NOT NULL DEFAULT 0,
    "rsvpPendingCount" INTEGER NOT NULL DEFAULT 0,
    "pushSent" BOOLEAN NOT NULL DEFAULT false,
    "pushCampaignId" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommEventInvitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CommEventRsvp" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountName" TEXT NOT NULL DEFAULT '',
    "accountRole" TEXT NOT NULL DEFAULT '',
    "response" TEXT NOT NULL DEFAULT 'PENDING',
    "guestCount" INTEGER NOT NULL DEFAULT 0,
    "respondedAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommEventRsvp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommEventInvitation_institutionId_status_idx" ON "CommEventInvitation"("institutionId", "status");
CREATE INDEX "CommEventInvitation_institutionId_academicYear_eventDate_idx" ON "CommEventInvitation"("institutionId", "academicYear", "eventDate");

CREATE UNIQUE INDEX "CommEventRsvp_eventId_accountId_key" ON "CommEventRsvp"("eventId", "accountId");
CREATE INDEX "CommEventRsvp_institutionId_accountId_response_idx" ON "CommEventRsvp"("institutionId", "accountId", "response");
CREATE INDEX "CommEventRsvp_eventId_response_idx" ON "CommEventRsvp"("eventId", "response");

ALTER TABLE "CommEventInvitation" ADD CONSTRAINT "CommEventInvitation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommEventRsvp" ADD CONSTRAINT "CommEventRsvp_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommEventRsvp" ADD CONSTRAINT "CommEventRsvp_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CommEventInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
