import 'dotenv/config';
import { connectDatabase, prisma } from '../src/lib/prisma.js';
import { purgeAllSiteData } from '../src/lib/clearDemoData.js';

const confirm = process.argv.includes('--confirm');
if (!confirm) {
  console.error('This will permanently delete all operational data except User, Institution, and InstitutionSetup.');
  console.error('Re-run with --confirm to proceed: npm run prisma:purge-demo -- --confirm');
  process.exit(1);
}

try {
  await connectDatabase();
  const result = await purgeAllSiteData();
  console.log(result.message);
  console.log(`Tables truncated: ${result.tablesTruncated}`);
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
