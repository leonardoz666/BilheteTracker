import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { config } from 'dotenv';

// Carregar variáveis de ambiente
config();

const { Pool } = pg;

// Singleton do Prisma Client para evitar múltiplas instâncias
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Validar DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL não está definida. Verifique seu arquivo .env');
}

// Criar pool de conexões PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX || 20),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS || 10_000),
  connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS || 5_000),
});

// Criar adaptador do Prisma para PostgreSQL
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // @ts-expect-error - Tipo complexo do adapter
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Middleware para logar queries lentas (acima de 1s)
prisma.$use(async (params, next) => {
  const start = performance.now();
  const result = await next(params);
  const duration = performance.now() - start;

  if (duration > 1_000) {
    console.warn(`[prisma] Slow query (${Math.round(duration)}ms): ${params.model}.${params.action}`);
  }

  return result;
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

