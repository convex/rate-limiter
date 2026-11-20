import { defineApp } from "convex/server";
import { test } from "vitest";
import rateLimiter from "./convex.config.js";

test("install args are type-checked in use()", () => {
  const app = defineApp();
  app.use(rateLimiter);
  app.use(rateLimiter, {
    args: {
      limits: {
        sendMessage: { kind: "token bucket", rate: 10, period: 60_000 },
        failedLogins: { kind: "fixed window", rate: 5, period: 60_000 },
      },
    },
  });
  app.use(rateLimiter, {
    args: {
      limits: {
        // @ts-expect-error rate is a number
        sendMessage: { kind: "token bucket", rate: "10", period: 60_000 },
      },
    },
  });
  app.use(rateLimiter, {
    args: {
      limits: {
        // @ts-expect-error kind must be "token bucket" or "fixed window"
        sendMessage: { kind: "sliding window", rate: 10, period: 60_000 },
      },
    },
  });
});
