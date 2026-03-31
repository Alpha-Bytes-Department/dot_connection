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
  const poolMax = Number(process.env.PG_POOL_MAX ?? 20);
  const poolMin = Number(process.env.PG_POOL_MIN ?? 2);
  const idleTimeoutMs = Number(process.env.PG_IDLE_TIMEOUT_MS ?? 300000); // 5 min
  const connectionTimeoutMs = Number(
    process.env.PG_CONNECTION_TIMEOUT_MS ?? 60000, // 60s
  );
  const statementTimeoutMs = Number(
    process.env.PG_STATEMENT_TIMEOUT_MS ?? 0, // 0 disables statement timeout
  );
  const idleInTxTimeoutMs = Number(
    process.env.PG_IDLE_IN_TX_TIMEOUT_MS ?? 0, // 0 disables forced tx timeout
  );

  globalThis.pgPool = pgPool = new pg.Pool({
    connectionString: config.database_url,
    max: poolMax,
    min: poolMin,
    idleTimeoutMillis: idleTimeoutMs,
    connectionTimeoutMillis: connectionTimeoutMs,
    maxUses: 7500,
    statement_timeout: statementTimeoutMs,
    idle_in_transaction_session_timeout: idleInTxTimeoutMs,
    keepAlive: true,
  });

  pgPool.on('error', (error) => {
    console.error(colors.red('Postgres pool error:'), error?.message);
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

    const maxAttempts = 5;
    const baseDelayMs = 1500;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await prisma.$connect();
        break;
      } catch (error: any) {
        const isLast = attempt === maxAttempts;
        console.error(
          colors.yellow(
            `Database connect attempt ${attempt}/${maxAttempts} failed: ${error?.message}`,
          ),
        );

        if (isLast) {
          throw error;
        }

        const delayMs = baseDelayMs * attempt;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

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
