import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    // process.env rather than env(): env() throws when the variable is unset,
    // which breaks `prisma generate` in builds that have no database.
    url: process.env.DATABASE_URL,
  },
});
