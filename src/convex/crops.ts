// Read-only crop catalogue queries.
import { v } from "convex/values";
import { query } from "./_generated/server";

/** The full catalogue (60 crops), optionally filtered by category. */
export const listCrops = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const crops = await ctx.db.query("crops").collect();
    const out = args.category
      ? crops.filter((c) => c.category === args.category)
      : crops;
    return out.sort((a, b) => a.name.localeCompare(b.name));
  },
});

/** Cheap bootstrap probe: how much of the demo marketplace exists? */
export const marketStatus = query({
  args: {},
  handler: async (ctx) => {
    const [crops, farmers] = await Promise.all([
      ctx.db.query("crops").collect(),
      ctx.db.query("farmers").collect(),
    ]);
    return { crops: crops.length, farmers: farmers.length };
  },
});

export const subcategories = query({
  args: { category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const crops = await ctx.db.query("crops").collect();
    const filtered = args.category
      ? crops.filter((c) => c.category === args.category)
      : crops;
    const map = new Map<string, string[]>();
    for (const c of filtered) {
      const list = map.get(c.category) ?? [];
      if (!list.includes(c.subcategory)) list.push(c.subcategory);
      map.set(c.category, list);
    }
    return [...map.entries()].map(([category, subs]) => ({
      category,
      subcategories: subs.sort(),
    }));
  },
});
