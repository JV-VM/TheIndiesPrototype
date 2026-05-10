import { defineConfig } from "@prisma/config";

export default defineConfig({
  engine: "classic",
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://tip:tip@localhost:5432/tip"
  },
  migrations: {
    path: "prisma/migrations",
    seed: "node --import tsx prisma/seed.ts"
  }
});
