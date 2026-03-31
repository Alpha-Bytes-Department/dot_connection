import { JwtPayload } from 'jsonwebtoken';
import type { PrismaClient as TPrismaClient } from '@prisma/client';
import type { Pool as TPgPool } from 'pg';

declare global {
  var pgPool: TPgPool | undefined;
  var prisma: TPrismaClient | undefined;

  namespace Express {
    interface Request {
      user: JwtPayload;
    }
  }
}
