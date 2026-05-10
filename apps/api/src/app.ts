import { assetsModule } from "./modules/assets/index.js";
import { authModule } from "./modules/auth/index.js";
import { healthModule } from "./modules/health/index.js";
import { jobsModule } from "./modules/jobs/index.js";
import { projectsModule } from "./modules/projects/index.js";
import { realtimeModule } from "./modules/realtime/index.js";
import { storageModule } from "./modules/storage/index.js";
import { usersModule } from "./modules/users/index.js";

export const backendModules = [
  authModule,
  usersModule,
  projectsModule,
  assetsModule,
  jobsModule,
  storageModule,
  realtimeModule,
  healthModule
] as const;
