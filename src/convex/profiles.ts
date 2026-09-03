// Onboarding, profile and access helpers.
// Roles: farmer | buyer | admin. Every signed-in user completes onboarding
// (role + basic profile) before using the product.
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { ROLES } from "./schema";
import type { Doc, Id } from "./_generated/dataModel";

export type AnyDbCtx = QueryCtx | MutationCtx;

/** Authenticated user id or null. */
export const getSessionUserId = async (ctx: AnyDbCtx): Promise<Id<"users"> | null> =>
  getAuthUserId(ctx);

/** Authenticated user doc or null. */
export async function getSessionUser(
  ctx: AnyDbCtx,
): Promise<Doc<"users"> | null> {
  const userId = await getSessionUserId(ctx);
  if (userId === null) return null;
  return (await ctx.db.get(userId)) ?? null;
}

/** Throws if not signed in / not onboarded. */
export async function requireUser(ctx: AnyDbCtx): Promise<Doc<"users">> {
  const user = await getSessionUser(ctx);
  if (!user) throw new ConvexError("Please sign in to continue.");
  if (!user.role) throw new ConvexError("Finish onboarding to continue.");
  return user;
}

export async function requireRole(
  ctx: AnyDbCtx,
  role: (typeof ROLES)[keyof typeof ROLES],
): Promise<Doc<"users">> {
  const user = await requireUser(ctx);
  if (user.role !== role) throw new ConvexError("Not authorised for this action.");
  return user;
}

export const myProfile = query({
  args: {},
  handler: async (ctx) => getSessionUser(ctx),
});

/** First step after sign-in: choose a role and fill in the profile. */
export const completeOnboarding = mutation({
  args: {
    role: v.union(
      v.literal(ROLES.BUYER),
      v.literal(ROLES.FARMER),
      v.literal(ROLES.ADMIN),
    ),
    name: v.string(),
    phone: v.optional(v.string()),
    addressLine: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    pincode: v.optional(v.string()),
    // Farmer-only details
    farmName: v.optional(v.string()),
    village: v.optional(v.string()),
    district: v.optional(v.string()),
    farmState: v.optional(v.string()),
    yearsFarming: v.optional(v.number()),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getSessionUserId(ctx);
    if (userId === null) throw new ConvexError("Please sign in first.");

    const existing = await ctx.db.get(userId);
    if (!existing) throw new ConvexError("Account not found.");

    if (args.name.trim().length < 2) {
      throw new ConvexError("Please enter your name.");
    }

    // Admin is a demo/operator role: allow it for guest (anonymous) sessions
    // so a hackathon demo can drive the admin dashboard without an email OTP.
    const wantsAdmin = args.role === ROLES.ADMIN;
    if (wantsAdmin && existing.isAnonymous !== true) {
      throw new ConvexError(
        "Admin accounts are provisioned by the platform operator. Use the guest demo session to explore the admin dashboard.",
      );
    }

    if (args.role === ROLES.FARMER) {
      if (!args.village || !args.district || !args.farmState || !args.phone) {
        throw new ConvexError(
          "Add your farm village, district, state and phone number to register as a farmer.",
        );
      }
    }

    const now = Date.now();

    await ctx.db.patch(userId, {
      name: args.name.trim(),
      phone: args.phone?.trim(),
      addressLine: args.addressLine?.trim(),
      city: args.city?.trim(),
      state: args.state?.trim(),
      pincode: args.pincode?.trim(),
      role: args.role,
      onboardedAt: now,
    });

    // Create / update the linked farmer row when role is farmer.
    if (args.role === ROLES.FARMER) {
      const existingFarmer = (
        await ctx.db
          .query("farmers")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .first()
      );

      const farmerFields = {
        name: args.name.trim(),
        farmName:
          args.farmName?.trim() || `${args.name.split(" ")[0]} Organic Farm`,
        village: args.village!.trim(),
        district: args.district!.trim(),
        state: args.farmState!.trim(),
        phone: args.phone?.trim(),
        bio:
          args.bio?.trim() ||
          `New farm on Farm Direct selling fresh, farm-gate produce.`,
        yearsFarming: args.yearsFarming ?? 4,
      };

      if (existingFarmer) {
        await ctx.db.patch(existingFarmer._id, farmerFields);
      } else {
        await ctx.db.insert("farmers", {
          ...farmerFields,
          userId,
          verified: false,
          isDemo: false,
          ratingAvg: 0,
          ratingCount: 0,
          createdAt: now,
        });
      }
    }

    return { role: args.role };
  },
});

/** Let users keep address/contact details current (buyer + farmer). */
export const updateMyProfile = mutation({
  args: {
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    addressLine: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    pincode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getSessionUserId(ctx);
    if (userId === null) throw new ConvexError("Please sign in first.");
    await ctx.db.patch(userId, {
      name: args.name?.trim() || undefined,
      phone: args.phone?.trim() || undefined,
      addressLine: args.addressLine?.trim() || undefined,
      city: args.city?.trim() || undefined,
      state: args.state?.trim() || undefined,
      pincode: args.pincode?.trim() || undefined,
    });
    return { ok: true };
  },
});
