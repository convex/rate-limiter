import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { internal } from "./_generated/api";
import { limits } from "./rateLimits";
import { initConvexTest } from "./setup.test";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

test("the install args store one document per named limit", async () => {
  const t = initConvexTest();
  const stored = await (t as any).runInComponent(
    "rateLimiter",
    async (ctx: any) => await ctx.db.query("limits").collect(),
  );
  expect(
    Object.fromEntries(
      stored.map((doc: { name: string; config: unknown }) => [
        doc.name,
        doc.config,
      ]),
    ),
  ).toEqual(limits);
  expect(stored).toHaveLength(Object.keys(limits).length);
});

test("named limits use the stored definitions", async () => {
  const t = initConvexTest();
  await t.mutation(internal.example.test, {});
  const status = await t.query(internal.example.check, { key: "user1" });
  expect(status.ok).toBe(false);
});
