import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const ALGO = 'aes-256-gcm';

function getMasterKey() {
  const secret = process.env.APP_ENCRYPTION_KEY || '360schoolerp-dev-kms-key-change-in-prod';
  return scryptSync(secret, '360schoolerp-kms-salt', 32);
}

export function encryptSecret(plain: string): { ciphertext: string; iv: string } {
  if (!plain) return { ciphertext: '', iv: '' };
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, getMasterKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: Buffer.concat([enc, tag]).toString('base64'),
    iv: iv.toString('base64'),
  };
}

export function decryptSecret(ciphertext: string, iv: string): string {
  if (!ciphertext || !iv) return '';
  const data = Buffer.from(ciphertext, 'base64');
  const ivBuf = Buffer.from(iv, 'base64');
  const tag = data.subarray(data.length - 16);
  const enc = data.subarray(0, data.length - 16);
  const decipher = createDecipheriv(ALGO, getMasterKey(), ivBuf);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
