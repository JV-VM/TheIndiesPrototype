import { imageProcessingPipeline } from "./processors/image-processing.js";
import { assetQueue } from "./queues/assets.js";
import { logHeartbeat } from "./runtime/heartbeat.js";

const intervalMs = 5000;

if (process.env.TIP_DRY_RUN === "1") {
  logHeartbeat(
    `dry run complete - queue=${assetQueue.name}, pipeline=${imageProcessingPipeline.name}`
  );
  process.exit(0);
}

logHeartbeat("placeholder worker booted");
logHeartbeat(`queue: ${assetQueue.name}`);
logHeartbeat(`pipeline: ${imageProcessingPipeline.name}`);

setInterval(() => {
  logHeartbeat(
    "idle heartbeat - waiting for Redis/BullMQ integration in Phase 6"
  );
}, intervalMs);
