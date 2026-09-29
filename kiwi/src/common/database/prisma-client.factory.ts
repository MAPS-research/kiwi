import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

function databaseUrl(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to create a Prisma client');
  }
  return connectionString;
}

export function createPrismaAdapter(): PrismaPg {
  return new PrismaPg({
    connectionString: databaseUrl(),
    connectionTimeoutMillis: 5_000,
  });
}

export function createPrismaClient(): PrismaClient {
  return new PrismaClient({ adapter: createPrismaAdapter() });
}
