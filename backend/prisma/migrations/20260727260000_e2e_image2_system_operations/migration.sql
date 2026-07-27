-- Image 2 E2E: Global environment settings

CREATE TABLE "global_settings" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT '',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "currencySymbol" TEXT NOT NULL DEFAULT '₹',
    "dateFormat" TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
    "language" TEXT NOT NULL DEFAULT 'English',
    "weekStartsOn" TEXT NOT NULL DEFAULT 'Monday',
    "brandingLogoUrl" TEXT NOT NULL DEFAULT '',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "global_settings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "global_settings_institutionId_key" ON "global_settings"("institutionId");
ALTER TABLE "global_settings" ADD CONSTRAINT "global_settings_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
