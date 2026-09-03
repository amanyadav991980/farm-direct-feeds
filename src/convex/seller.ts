// Helpers to resolve "the farmer row behind the signed-in user".
import { ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { getSessionUser, type AnyDbCtx } from "./profiles";

export async function myFarmerOrNull(
  ctx: AnyDbCtx,
): Promise<Doc<"farmers"> | null> {
  const user = await getSessionUser(ctx);
  if (!user || user.role !== "farmer") return null;
  return (
    (await ctx.db
      .query("farmers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first()) ?? null
  );
}

/** Throws unless the signed-in user owns a farmer row, then returns it. */
export async function requireMyFarmer(
  ctx: AnyDbCtx,
): Promise<Doc<"farmers">> {
  const farmer = await myFarmerOrNull(ctx);
  if (!farmer) {
    throw new ConvexError(
      "Register as a farmer first — your farm profile is missing.",
    );
  }
  return farmer;
}
