import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const demoUserPassword = "Prototype123!";

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(demoUserPassword, 12);
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@theindiesprototype.local" },
    update: {
      passwordHash
    },
    create: {
      email: "demo@theindiesprototype.local",
      passwordHash
    }
  });

  await prisma.project.upsert({
    where: {
      id: "tip-demo-project"
    },
    update: {},
    create: {
      id: "tip-demo-project",
      userId: demoUser.id,
      name: "Demo Workspace",
      description: "Seeded project for local infrastructure verification."
    }
  });

  await prisma.asset.upsert({
    where: {
      id: "tip-demo-asset-cover"
    },
    update: {
      status: "draft",
      originalFilename: "cover-art.png",
      contentType: "image/png",
      byteSize: BigInt(262144)
    },
    create: {
      id: "tip-demo-asset-cover",
      projectId: "tip-demo-project",
      userId: demoUser.id,
      kind: "image",
      status: "draft",
      originalFilename: "cover-art.png",
      contentType: "image/png",
      byteSize: BigInt(262144),
      metadata: {
        stage: "concept"
      }
    }
  });

  await prisma.asset.upsert({
    where: {
      id: "tip-demo-asset-trailer"
    },
    update: {
      status: "processing",
      originalFilename: "teaser-trailer.mp4",
      contentType: "video/mp4",
      byteSize: BigInt(7340032)
    },
    create: {
      id: "tip-demo-asset-trailer",
      projectId: "tip-demo-project",
      userId: demoUser.id,
      kind: "video",
      status: "processing",
      originalFilename: "teaser-trailer.mp4",
      contentType: "video/mp4",
      byteSize: BigInt(7340032),
      metadata: {
        stage: "rough-cut"
      }
    }
  });

  console.log(
    `[prisma-seed] demo credentials ready: demo@theindiesprototype.local / ${demoUserPassword}`
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
