-- Mobile OTP challenges for production login hardening
CREATE TABLE "MobileOtpChallenge" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'login',
    "app" TEXT NOT NULL,
    "layer" TEXT NOT NULL DEFAULT '',
    "identifier" TEXT NOT NULL,
    "registeredMobile" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileOtpChallenge_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MobileOtpChallenge_institutionId_registeredMobile_identifier_c_idx" ON "MobileOtpChallenge"("institutionId", "registeredMobile", "identifier", "createdAt");
