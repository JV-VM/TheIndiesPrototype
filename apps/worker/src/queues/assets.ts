export const assetQueue = {
  name: "asset-processing",
  responsibility: "Owns queue consumption for asset-derived job execution.",
  retryPolicy: "3 attempts with exponential backoff"
} as const;
