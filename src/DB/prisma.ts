import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import config from '../config';
import { PrismaClient } from '@prisma/client';
import colors from 'colors';

/**
 * Create pg.Pool singleton
 */
let pgPool = globalThis.pgPool;

if (!pgPool) {
  globalThis.pgPool = pgPool = new pg.Pool({
    connectionString: config.database_url_old,
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    maxUses: 7500,
    statement_timeout: 30000,
    idle_in_transaction_session_timeout: 60000,
  });
}

/**
 * Create Prisma Client singleton
 */
let prisma = globalThis.prisma!;

if (!prisma) {
  globalThis.prisma = prisma = new PrismaClient({
    adapter: new PrismaPg(pgPool),
  });
}

/** Connect to the database */
export async function connectDB() {
  console.log(colors.green('Connecting to the database...'));

  try {
    if (!prisma || !pgPool) {
      console.error(colors.red('Failed to connect to the database.'));
      return () => {
        /* no-op */
      };
    }

    await prisma.$connect();
    console.log(colors.green('Connected to the database.'));

    return async () => {
      console.log(colors.blue('Disconnecting database...'));

      await prisma?.$disconnect();
      await pgPool?.end();

      console.log(colors.green('Database disconnected.'));
    };
  } catch (error: any) {
    console.error(
      colors.red('Failed to connect to the database. ' + error?.message),
      error?.stack,
    );
    process.exit(1);
  }
}

export { prisma, pgPool };
