---
"@convex-dev/rate-limiter": patch
---

Allow `RateLimiter.check` to evaluate availability at a supplied timestamp.
Direct callers of the component query `lib.checkRateLimit` must pass `now` in
milliseconds.
