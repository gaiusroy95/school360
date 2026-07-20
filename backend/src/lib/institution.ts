import { prisma } from './prisma.js';

export async function getDefaultInstitutionId() {
  let institution = await prisma.institution.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!institution) {
    institution = await prisma.institution.create({
      data: {
        name: 'Greenwood International School',
        setup: { create: {} },
      },
    });
  }
  return institution.id;
}
