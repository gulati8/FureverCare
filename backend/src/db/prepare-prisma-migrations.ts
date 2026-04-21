import { execFileSync } from 'node:child_process';
import { Client } from 'pg';
import { config } from '../config/index.js';

const BASELINE_MIGRATION = '0_init';

type ExistsRow = {
  exists: boolean;
};

async function tableExists(client: Client, tableName: string): Promise<boolean> {
  const result = await client.query<ExistsRow>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
     ) AS exists`,
    [tableName]
  );

  return result.rows[0]?.exists ?? false;
}

function runPrismaResolve(): void {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  execFileSync(command, ['prisma', 'migrate', 'resolve', '--applied', BASELINE_MIGRATION], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: process.env,
  });
}

async function preparePrismaMigrations(): Promise<void> {
  const client = new Client({ connectionString: config.database.url });
  await client.connect();

  try {
    const hasPrismaMigrationsTable = await tableExists(client, '_prisma_migrations');
    if (hasPrismaMigrationsTable) {
      console.log('Prisma migrations table already exists, skipping baseline preparation.');
      return;
    }

    const hasLegacySchema = await tableExists(client, 'users');
    if (!hasLegacySchema) {
      console.log('No existing application schema detected, skipping baseline preparation.');
      return;
    }

    console.log(`Existing schema detected without Prisma history, marking ${BASELINE_MIGRATION} as applied.`);
    runPrismaResolve();
  } finally {
    await client.end();
  }
}

preparePrismaMigrations().catch((error) => {
  console.error('Failed to prepare Prisma migrations:', error);
  process.exit(1);
});
