// Admin reseed action. The deterministic generator lives in seedRun.ts and
// the internal write primitives live in seedHelpers.ts — this file only wires
// the admin-gated entry point.
import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { runSeed } from "./seedRun";
import type { Id } from "./_generated/dataModel";

export const seedDatabase = action({
  args: {},
  handler: async (ctx) => {
    // admin gate — actions have no session, so check via auth identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Sign in to reseed the demo data.");
    const user = await ctx.runQuery(internal.seedHelpers.getUserById, {
      userId: identity.subject as Id<"users">,
    });
    if (!user || user.role !== "admin") {
      throw new ConvexError("Admin access required to reseed demo data.");
    }
    return runSeed(ctx);
  },
});
