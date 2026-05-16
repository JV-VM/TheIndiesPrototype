import type { PrismaClient, User } from "@prisma/client";

import { hashPassword } from "./password.js";

export const DEMO_USER_EMAIL = "demo@theindiesprototype.local";
export const DEMO_USER_PASSWORD = "Prototype123!";
export const DEMO_PROJECT_ID = "tip-demo-project";

type DemoWorkspacePrisma = Pick<PrismaClient, "user" | "project" | "asset">;

export async function ensureDemoWorkspace(
  prisma: DemoWorkspacePrisma
): Promise<User> {
  const passwordHash = await hashPassword(DEMO_USER_PASSWORD);
  const demoUser = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    update: {
      passwordHash
    },
    create: {
      email: DEMO_USER_EMAIL,
      passwordHash
    }
  });

  await prisma.project.upsert({
    where: {
      id: DEMO_PROJECT_ID
    },
    update: {},
    create: {
      id: DEMO_PROJECT_ID,
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
      projectId: DEMO_PROJECT_ID,
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
      projectId: DEMO_PROJECT_ID,
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

  return demoUser;
}
