import { ParentRelationship } from '@prisma/client';

export function normalizeMobileDigits(mobile: string): string {
  return mobile.replace(/\D/g, '');
}

export function makeParentKey(relationship: ParentRelationship, mobile: string, name: string) {
  const id =
    normalizeMobileDigits(mobile) ||
    name.trim().toLowerCase().replace(/[^a-z0-9]+/gi, '_').slice(0, 40) ||
    'unknown';
  return `${relationship}:${id}`;
}
