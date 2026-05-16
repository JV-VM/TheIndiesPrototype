import { PrismaClient } from "@prisma/client";

import {
  DEMO_USER_EMAIL,
  DEMO_USER_PASSWORD,
  ensureDemoWorkspace
} from "../src/modules/auth/demo-workspace.js";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await ensureDemoWorkspace(prisma);

  console.log(
    `[prisma-seed] demo credentials ready: ${DEMO_USER_EMAIL} / ${DEMO_USER_PASSWORD}`
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error("[prisma-seed] failed", error);
    await prisma.$disconnect();
    process.exit(1);
  });
