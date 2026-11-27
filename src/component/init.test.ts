import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Infer } from "convex/values";
import type { configValidator } from "../shared.js";
import schema from "./schema.js";
import { modules } from "./setup.test.js";
import { api, internal } from "./_generated/api.js";
import { applyLimits } from "./init.js";
import type { MutationCtx } from "./_generated/server.js";

type Config = Infer<typeof configValidator>;

const Minute = 60_000;
const sendMessage: Config = {
  kind: "token bucket",
  rate: 10,
  period: Minute,
  capacity: 3,
};
const signUp: Config = { kind: "fixed window", rate: 100, period: 60 * Minute };
const login: Config = { kind: "fixed window", rate: 5, period: Minute };

function setup() {
  return convexTest(schema, modules);
}

async function storedLimits(t: ReturnType<typeof setup>) {
  return await t.run((ctx) => ctx.db.query("limits").collect());
}

describe("init", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("a later push updates, deletes and inserts limits by name", async () => {
    const t = setup();
    await t.mutation(internal.init.init, { limits: { sendMessage, signUp } });
    const [before] = (await storedLimits(t)).filter(
      (doc) => doc.name === "sendMessage",
    );

    const changed: Config = { ...sendMessage, capacity: 5 };
    await t.mutation(internal.init.init, {
      limits: { sendMessage: changed, login },
    });
    const after = await storedLimits(t);
    expect(after.map(({ name, config }) => ({ name, config }))).toEqual([
      { name: "sendMessage", config: changed },
      { name: "login", config: login },
    ]);
    expect(after[0]._id).toEqual(before._id);
  });

  test("an unchanged push writes nothing", async () => {
    const t = setup();
    await t.mutation(internal.init.init, { limits: { sendMessage, signUp } });
    const writes = await t.run(async (ctx) => {
      const writes: string[] = [];
      const record =
        (op: string) =>
        async (..._args: unknown[]) => {
          writes.push(op);
        };
      const db = {
        query: ctx.db.query.bind(ctx.db),
        insert: record("insert"),
        replace: record("replace"),
        patch: record("patch"),
        delete: record("delete"),
      } as unknown as MutationCtx["db"];
      const reordered = { capacity: 3, period: Minute, rate: 10 } as const;
      await applyLimits(
        { db },
        { signUp, sendMessage: { ...reordered, kind: "token bucket" } },
      );
      return writes;
    });
    expect(writes).toEqual([]);
  });

  test("checks use the stored definition, and see changes from a later push", async () => {
    const t = setup();
    const name = "sendMessage";
    await t.mutation(internal.init.init, { limits: { sendMessage } });
    for (let i = 0; i < 3; i++) {
      expect((await t.mutation(api.lib.rateLimit, { name })).ok).toBe(true);
    }
    expect((await t.mutation(api.lib.rateLimit, { name })).ok).toBe(false);
    expect((await t.query(api.lib.getValue, { name })).config).toMatchObject(
      sendMessage,
    );

    await t.mutation(internal.init.init, {
      limits: { sendMessage: { ...sendMessage, rate: 60 } },
    });
    vi.advanceTimersByTime(2_000);
    expect((await t.mutation(api.lib.rateLimit, { name })).ok).toBe(true);
  });

  test("an inline config overrides the stored definition", async () => {
    const t = setup();
    await t.mutation(internal.init.init, { limits: { sendMessage } });
    const config: Config = { kind: "token bucket", rate: 1, period: Minute };
    await t.mutation(api.lib.rateLimit, { name: "sendMessage", config });
    const status = await t.query(api.lib.checkRateLimit, {
      name: "sendMessage",
      config,
    });
    expect(status.ok).toBe(false);
  });

  test("a name that's neither stored nor inline throws", async () => {
    const t = setup();
    await t.mutation(internal.init.init, { limits: { sendMessage } });
    await expect(
      t.mutation(api.lib.rateLimit, { name: "unknown" }),
    ).rejects.toThrow(/Rate limit unknown not defined/);
  });
});
