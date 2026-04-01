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
  // Avoid keeping warm clients when the host drops idle TCP (common with cloud DBs).
  const poolMin = Number(process.env.PG_POOL_MIN ?? 0);
  const idleTimeoutMs = Number(process.env.PG_IDLE_TIMEOUT_MS ?? 60000); // 1 min idle eviction
  const connectionTimeoutMs = Number(
    process.env.PG_CONNECTION_TIMEOUT_MS ?? 60000,
  );
  const statementTimeoutMs = Number(process.env.PG_STATEMENT_TIMEOUT_MS ?? 0);
  const idleInTxTimeoutMs = Number(process.env.PG_IDLE_IN_TX_TIMEOUT_MS ?? 0);
  // Recycle sockets before the server/proxy kills them (fixes "worked once, then timeout").
  const maxLifetimeSeconds = Number(
    process.env.PG_MAX_LIFETIME_SECONDS ?? 300,
  );

  const poolConfig: pg.PoolConfig = {
    connectionString: config.database_url,
    max: poolMax,
    min: poolMin,
    idleTimeoutMillis: idleTimeoutMs,
    connectionTimeoutMillis: connectionTimeoutMs,
    maxUses: 7500,
    keepAlive: true,
  };

  if (maxLifetimeSeconds > 0) {
    poolConfig.maxLifetimeSeconds = maxLifetimeSeconds;
  }

  if (statementTimeoutMs > 0) {
    (poolConfig as pg.PoolConfig & { statement_timeout?: number }).statement_timeout =
      statementTimeoutMs;
  }
  if (idleInTxTimeoutMs > 0) {
    (
      poolConfig as pg.PoolConfig & {
        idle_in_transaction_session_timeout?: number;
      }
    ).idle_in_transaction_session_timeout = idleInTxTimeoutMs;
  }

  globalThis.pgPool = pgPool = new pg.Pool(poolConfig);

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
