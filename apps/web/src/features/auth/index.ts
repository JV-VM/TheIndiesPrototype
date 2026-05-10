export const authFeature = {
  name: "auth",
  label: "Authentication",
  responsibility:
    "Handles sign-in, sign-up, session restore, and protected route state.",
  nextPhase: "JWT and refresh-token flows"
} as const;
