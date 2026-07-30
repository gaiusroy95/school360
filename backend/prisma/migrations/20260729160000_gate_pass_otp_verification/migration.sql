ALTER TABLE "StudentGatePass" ADD COLUMN "otpVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "StudentGatePass" ADD COLUMN "otpVerifiedAt" TIMESTAMP(3);
