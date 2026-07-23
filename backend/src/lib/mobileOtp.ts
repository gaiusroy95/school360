import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from './prisma.js';
import { getDefaultInstitutionId } from './institution.js';
import { normalizeMobileDigits } from './mobileUtils.js';
import { sendSmsMsg91 } from './sms.js';
import { loginStaff, loginStudentParent } from './mobileAuth.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_PER_HOUR = 6;

export function getMobileAuthModes() {
  const otpEnabled = process.env.MOBILE_OTP_ENABLED === 'true';
  const otpRequired = process.env.MOBILE_OTP_REQUIRED === 'true';
  return {
    otpEnabled,
    otpRequired,
    passwordAllowed: !otpRequired,
  };
}

export function assertPasswordLoginAllowed() {
  if (process.env.MOBILE_OTP_REQUIRED === 'true') {
    throw new Error('Password sign-in is disabled. Please use OTP login.');
  }
}

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

async function assertRateLimit(institutionId: string, registeredMobile: string) {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const count = await prisma.mobileOtpChallenge.count({
    where: {
      institutionId,
      registeredMobile: normalizeMobileDigits(registeredMobile),
      createdAt: { gte: since },
    },
  });
  if (count >= RATE_LIMIT_PER_HOUR) {
    throw new Error('Too many OTP requests. Please try again later.');
  }
}

export async function requestMobileOtp(input: {
  app: 'student-parent' | 'staff';
  layer?: 'student' | 'parent';
  admissionNumber?: string;
  employeeCode?: string;
  registeredMobile: string;
}) {
  if (process.env.MOBILE_OTP_ENABLED !== 'true') {
    throw new Error('OTP login is not enabled on this server');
  }

  const institutionId = await getDefaultInstitutionId();
  const registeredMobile = input.registeredMobile.trim();
  await assertRateLimit(institutionId, registeredMobile);

  const identifier =
    input.app === 'staff'
      ? (input.employeeCode || '').trim()
      : (input.admissionNumber || '').trim();

  if (!identifier) throw new Error('Admission number or employee code is required');

  // Validate account exists in school records (throws same errors as login)
  if (input.app === 'staff') {
    await loginStaff({
      employeeCode: identifier,
      registeredMobile,
      password: registeredMobile,
      institutionId,
      otpVerified: true,
      dryRun: true,
    });
  } else {
    await loginStudentParent({
      layer: input.layer || 'student',
      admissionNumber: identifier,
      registeredMobile,
      password: registeredMobile,
      institutionId,
      otpVerified: true,
      dryRun: true,
    });
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.mobileOtpChallenge.create({
    data: {
      institutionId,
      app: input.app,
      layer: input.layer || '',
      identifier,
      registeredMobile: normalizeMobileDigits(registeredMobile),
      otpHash,
      expiresAt,
    },
  });

  const message = `Your 360schoolERP login code is ${otp}. Valid for 10 minutes. Do not share this code.`;
  await sendSmsMsg91(institutionId, registeredMobile, message, process.env.MSG91_OTP_TEMPLATE_ID);

  const response: Record<string, unknown> = {
    ok: true,
    expiresInSeconds: OTP_TTL_MS / 1000,
    maskedMobile: registeredMobile.replace(/\d(?=\d{4})/g, '•'),
  };

  if (process.env.NODE_ENV !== 'production') {
    response.devOtp = otp;
  }

  return response;
}

export async function verifyMobileOtpAndLogin(input: {
  app: 'student-parent' | 'staff';
  layer?: 'student' | 'parent';
  admissionNumber?: string;
  employeeCode?: string;
  registeredMobile: string;
  otp: string;
}) {
  if (process.env.MOBILE_OTP_ENABLED !== 'true') {
    throw new Error('OTP login is not enabled on this server');
  }

  const institutionId = await getDefaultInstitutionId();
  const registeredMobile = normalizeMobileDigits(input.registeredMobile.trim());
  const identifier =
    input.app === 'staff'
      ? (input.employeeCode || '').trim()
      : (input.admissionNumber || '').trim();
  const otp = input.otp.trim();

  if (!identifier || otp.length < 4) {
    throw new Error('Invalid OTP request');
  }

  const challenge = await prisma.mobileOtpChallenge.findFirst({
    where: {
      institutionId,
      app: input.app,
      layer: input.layer || '',
      identifier,
      registeredMobile,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!challenge) throw new Error('OTP expired or not found. Request a new code.');

  if (challenge.attempts >= MAX_ATTEMPTS) {
    throw new Error('Too many invalid attempts. Request a new OTP.');
  }

  const valid = await bcrypt.compare(otp, challenge.otpHash);
  if (!valid) {
    await prisma.mobileOtpChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    throw new Error('Invalid OTP code');
  }

  await prisma.mobileOtpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  if (input.app === 'staff') {
    return loginStaff({
      employeeCode: identifier,
      registeredMobile: input.registeredMobile.trim(),
      password: input.registeredMobile.trim(),
      institutionId,
      otpVerified: true,
    });
  }

  return loginStudentParent({
    layer: input.layer || 'student',
    admissionNumber: identifier,
    registeredMobile: input.registeredMobile.trim(),
    password: input.registeredMobile.trim(),
    institutionId,
    otpVerified: true,
  });
}
