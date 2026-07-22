import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const migrationName = process.argv[2];
if (!migrationName) {
  console.error('Usage: tsx scripts/mark-migration-applied.ts <migration_folder_name>');
  process.exit(1);
}

const prisma = new PrismaClient();
const sqlPath = `prisma/migrations/${migrationName}/migration.sql`;
const sql = readFileSync(sqlPath);
const checksum = createHash('sha256').update(sql).digest('hex');

const existing = await prisma.$queryRaw<{ migration_name: string }[]>`
  SELECT migration_name FROM _prisma_migrations WHERE migration_name = ${migrationName}
`;

if (existing.length > 0) {
  console.log(`Already recorded: ${migrationName}`);
} else {
  await prisma.$executeRaw`
    INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
    VALUES (gen_random_uuid()::text, ${checksum}, NOW(), ${migrationName}, NULL, NULL, NOW(), 1)
  `;
  console.log(`Recorded migration: ${migrationName} (checksum ${checksum.slice(0, 12)}…)`);
}

await prisma.$disconnect();
