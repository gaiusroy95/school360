-- CreateEnum
CREATE TYPE "PublicationDestination" AS ENUM ('ENTRANCE_EXAM_PORTAL');
CREATE TYPE "PublicationVisibility" AS ENUM ('WEB', 'APP', 'BOTH');

-- CreateTable
CREATE TABLE "TestPublication" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "destination" "PublicationDestination" NOT NULL DEFAULT 'ENTRANCE_EXAM_PORTAL',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "visibleOn" "PublicationVisibility" NOT NULL DEFAULT 'BOTH',
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedBy" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "TestPublication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EntranceExamCredential" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "tokenNumber" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "pinPlain" TEXT NOT NULL DEFAULT '',
    "deliveredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntranceExamCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EntranceExamAttempt" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "answers" JSONB NOT NULL DEFAULT '{}',
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntranceExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TestPublication_testId_key" ON "TestPublication"("testId");
CREATE INDEX "TestPublication_institutionId_scheduledAt_idx" ON "TestPublication"("institutionId", "scheduledAt");
CREATE UNIQUE INDEX "EntranceExamCredential_tokenNumber_key" ON "EntranceExamCredential"("tokenNumber");
CREATE UNIQUE INDEX "EntranceExamCredential_publicationId_applicationId_key" ON "EntranceExamCredential"("publicationId", "applicationId");
CREATE INDEX "EntranceExamCredential_tokenNumber_idx" ON "EntranceExamCredential"("tokenNumber");
CREATE UNIQUE INDEX "EntranceExamAttempt_credentialId_key" ON "EntranceExamAttempt"("credentialId");

-- AddForeignKey
ALTER TABLE "TestPublication" ADD CONSTRAINT "TestPublication_testId_fkey" FOREIGN KEY ("testId") REFERENCES "AdmissionTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntranceExamCredential" ADD CONSTRAINT "EntranceExamCredential_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "TestPublication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntranceExamCredential" ADD CONSTRAINT "EntranceExamCredential_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EntranceExamAttempt" ADD CONSTRAINT "EntranceExamAttempt_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "EntranceExamCredential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
