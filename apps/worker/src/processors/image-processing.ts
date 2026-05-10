export const imageProcessingPipeline = {
  name: "image-processing",
  responsibility:
    "Will host Sharp-based transformations and derivative output generation.",
  initialOutput: "thumbnails"
} as const;
