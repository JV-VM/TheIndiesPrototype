export interface FailureTransitionInput {
  attemptsMade: number;
  maxAttempts: number;
}

export interface FailureTransition {
  jobStatus: "queued" | "failed";
  assetStatus: "queued" | "failed";
  completedAt: Date | null;
}

export function buildFailureTransition(
  input: FailureTransitionInput
): FailureTransition {
  const isTerminalFailure = input.attemptsMade >= input.maxAttempts;

  return {
    jobStatus: isTerminalFailure ? "failed" : "queued",
    assetStatus: isTerminalFailure ? "failed" : "queued",
    completedAt: isTerminalFailure ? new Date() : null
  };
}
