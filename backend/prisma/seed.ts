import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@360schoolerp.com';
  const password = 'Admin@12345';
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      displayName: 'Super Admin',
      role: 'SUPER_ADMIN',
    },
  });

  const institution = await prisma.institution.upsert({
    where: { id: 'seed-institution' },
    update: {},
    create: {
      id: 'seed-institution',
      name: 'Greenwood International School',
      setup: { create: {} },
    },
  });

  console.log('Seeded user:', user.email, '(password: Admin@12345)');
  console.log('Seeded institution:', institution.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
