import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL || '';
  const host = url.match(/@([^/]+)/)?.[1] || '(unknown)';
  console.log('Testing connection to:', host);
  await prisma.$connect();
  const count = await prisma.user.count();
  console.log('DB OK — users:', count);
}

main()
  .catch((e: Error) => {
    console.error('DB FAIL:', e.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
