import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config/index.js';
import { PrismaClient } from '../generated/prisma/client.js';

declare global {
  // eslint-disable-next-line no-var
  var __furevercarePrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__furevercarePrisma__ ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: config.database.url }),
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__furevercarePrisma__ = prisma;
}
