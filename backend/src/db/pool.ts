import { prisma } from './prisma.js';

type RawExecutor = {
  $executeRawUnsafe(query: string, ...values: any[]): Promise<number>;
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Promise<T>;
};

type QueryResult<T = any> = {
  rows: T[];
  rowCount: number;
};

export type DbTransactionClient = {
  query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
};

function returnsRows(sql: string): boolean {
  const normalized = sql.trim().toUpperCase();
  return normalized.startsWith('SELECT') || normalized.startsWith('WITH') || /\bRETURNING\b/i.test(sql);
}

async function runQuery<T>(
  executor: RawExecutor,
  text: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  if (returnsRows(text)) {
    const rows = (await executor.$queryRawUnsafe<T[]>(text, ...params)) ?? [];
    return {
      rows,
      rowCount: rows.length,
    };
  }

  const rowCount = await executor.$executeRawUnsafe(text, ...params);
  return {
    rows: [],
    rowCount,
  };
}

export const pool = {
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    return runQuery<T>(prisma, text, params);
  },
  async end(): Promise<void> {
    await prisma.$disconnect();
  },
  on(_event: string, _handler: (...args: any[]) => void): void {
    // Prisma manages its own connection lifecycle; the legacy pool event API is kept as a no-op bridge.
  },
};

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  return (await runQuery<T>(prisma, text, params)).rows;
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

export async function transaction<T>(
  callback: (client: DbTransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const client: DbTransactionClient = {
      async query<U = any>(text: string, params?: any[]): Promise<QueryResult<U>> {
        return runQuery<U>(tx, text, params);
      },
    };

    return callback(client);
  });
}
