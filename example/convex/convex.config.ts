import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import { limits } from "./rateLimits";

const app = defineApp();
app.use(rateLimiter, { args: { limits } });

export default app;
