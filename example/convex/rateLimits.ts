import { HOUR, MINUTE, type RateLimitConfig } from "@convex-dev/rate-limiter";

export const limits = {
  // A per-user limit, allowing one every ~6 seconds.
  // Allows up to 3 in quick succession if they haven't sent many recently.
  sendMessage: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 3 },
  // One global / singleton rate limit
  freeTrialSignUp: { kind: "fixed window", rate: 100, period: HOUR },
  demoLimit: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 10 },
} satisfies Record<string, RateLimitConfig>;
