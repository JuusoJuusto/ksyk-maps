import { defineConfig } from 'prisma';

export default defineConfig({
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
