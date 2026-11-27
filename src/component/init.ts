import { v, type Infer } from "convex/values";
import { configValidator } from "../shared.js";
import { internalMutation, type MutationCtx } from "./_generated/server.js";

type Config = Infer<typeof configValidator>;

export const init = internalMutation({
  args: { limits: v.optional(v.record(v.string(), configValidator)) },
  returns: v.null(),
  handler: async (ctx, { limits }) => {
    await applyLimits(ctx, limits ?? {});
    return null;
  },
});

/**
 * Stores one `limits` document per named limit. Writes only what changed,
 * since every rate limit check reads its definition and a write would
 * conflict with in-flight checks.
 */
export async function applyLimits(
  ctx: Pick<MutationCtx, "db">,
  limits: Record<string, Config>,
) {
  for (const [name, config] of Object.entries(limits)) {
    const existing = await ctx.db
      .query("limits")
      .withIndex("name", (q) => q.eq("name", name))
      .unique();
    if (!existing) {
      await ctx.db.insert("limits", { name, config });
    } else if (!sameConfig(existing.config, config)) {
      await ctx.db.replace("limits", existing._id, { name, config });
    }
  }
  const names = new Set(Object.keys(limits));
  for (const doc of await ctx.db.query("limits").collect()) {
    if (!names.has(doc.name)) {
      await ctx.db.delete("limits", doc._id);
    }
  }
}

function sameConfig(a: Config, b: Config) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].every((k) => a[k as keyof Config] === b[k as keyof Config]);
}
