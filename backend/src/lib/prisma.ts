import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

export async function connectDatabase(retries = 5, delayMs = 2000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await prisma.$connect();
      console.log('Database connected');
      return;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (attempt === retries) {
        console.error('Database connection failed after retries:', message);
        throw err;
      }
      console.warn(`Database connect attempt ${attempt}/${retries} failed — retrying in ${delayMs}ms`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}
