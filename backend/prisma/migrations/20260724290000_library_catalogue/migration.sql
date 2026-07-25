ALTER TABLE "LibBook" ADD COLUMN IF NOT EXISTS "authorId" TEXT;
ALTER TABLE "LibBook" ADD COLUMN IF NOT EXISTS "publisherId" TEXT;
ALTER TABLE "LibBook" ADD COLUMN IF NOT EXISTS "edition" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LibBook" ADD COLUMN IF NOT EXISTS "summary" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LibBook" ADD COLUMN IF NOT EXISTS "coverImageUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "LibBook" ADD COLUMN IF NOT EXISTS "tags" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "LibBook" ADD COLUMN IF NOT EXISTS "resourceType" TEXT NOT NULL DEFAULT 'PHYSICAL';
ALTER TABLE "LibBook" ADD COLUMN IF NOT EXISTS "searchCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LibBook" ADD COLUMN IF NOT EXISTS "viewCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "LibAuthor" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "bio" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibAuthor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibPublisher" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "publisherName" TEXT NOT NULL,
    "website" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibPublisher_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibBookCopy" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "copyCode" TEXT NOT NULL,
    "rackLocation" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibBookCopy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibReservation" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL DEFAULT '2025-26',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LibReservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LibSearchLog" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "searchedBy" TEXT NOT NULL DEFAULT 'OPAC User',
    "searchedByRole" TEXT NOT NULL DEFAULT 'STUDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LibSearchLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "LibAuthor_institutionId_authorName_key" ON "LibAuthor"("institutionId", "authorName");
CREATE UNIQUE INDEX IF NOT EXISTS "LibPublisher_institutionId_publisherName_key" ON "LibPublisher"("institutionId", "publisherName");
CREATE UNIQUE INDEX IF NOT EXISTS "LibBookCopy_institutionId_copyCode_key" ON "LibBookCopy"("institutionId", "copyCode");
CREATE INDEX IF NOT EXISTS "LibBook_authorId_idx" ON "LibBook"("authorId");
CREATE INDEX IF NOT EXISTS "LibBook_publisherId_idx" ON "LibBook"("publisherId");
CREATE INDEX IF NOT EXISTS "LibBook_title_idx" ON "LibBook"("title");
CREATE INDEX IF NOT EXISTS "LibBook_isbn_idx" ON "LibBook"("isbn");
CREATE INDEX IF NOT EXISTS "LibAuthor_institutionId_authorName_idx" ON "LibAuthor"("institutionId", "authorName");
CREATE INDEX IF NOT EXISTS "LibPublisher_institutionId_publisherName_idx" ON "LibPublisher"("institutionId", "publisherName");
CREATE INDEX IF NOT EXISTS "LibBookCopy_bookId_status_idx" ON "LibBookCopy"("bookId", "status");
CREATE INDEX IF NOT EXISTS "LibReservation_institutionId_bookId_status_idx" ON "LibReservation"("institutionId", "bookId", "status");
CREATE INDEX IF NOT EXISTS "LibReservation_memberId_status_idx" ON "LibReservation"("memberId", "status");
CREATE INDEX IF NOT EXISTS "LibSearchLog_institutionId_createdAt_idx" ON "LibSearchLog"("institutionId", "createdAt");
CREATE INDEX IF NOT EXISTS "LibSearchLog_institutionId_query_idx" ON "LibSearchLog"("institutionId", "query");

ALTER TABLE "LibBook" ADD CONSTRAINT "LibBook_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "LibAuthor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibBook" ADD CONSTRAINT "LibBook_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "LibPublisher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibBookCopy" ADD CONSTRAINT "LibBookCopy_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibBookCopy" ADD CONSTRAINT "LibBookCopy_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibReservation" ADD CONSTRAINT "LibReservation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibReservation" ADD CONSTRAINT "LibReservation_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "LibBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibReservation" ADD CONSTRAINT "LibReservation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "LibMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibAuthor" ADD CONSTRAINT "LibAuthor_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibPublisher" ADD CONSTRAINT "LibPublisher_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibSearchLog" ADD CONSTRAINT "LibSearchLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
