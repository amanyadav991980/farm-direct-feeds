// Coupons / promo codes — every validation happens server-side.
import { ConvexError, v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { requireRole, requireUser } from "./profiles";
import { CATEGORIES, type Category } from "./schema";
import type { Doc, Id } from "./_generated/dataModel";

export type CouponEligibilityItem = {
  category: string;
  farmerId: Id<"farmers">;
  productId: Id<"products">;
  discountedSubtotal: number; // selling-price subtotal of this line
};

export type CouponResult = {
  coupon: Doc<"coupons"> | null;
  discount: number;
  eligibleSubtotal: number;
};

type CouponCtx = QueryCtx | MutationCtx;

export async function evaluateCouponCode(
  ctx: CouponCtx,
  code: string | undefined,
  items: CouponEligibilityItem[],
  buyerId: Id<"users">,
): Promise<CouponResult> {
  if (!code?.trim()) return { coupon: null, discount: 0, eligibleSubtotal: 0 };
  const normalized = code.trim().toUpperCase();
  const coupon = await ctx.db
    .query("coupons")
    .withIndex("by_code", (q) => q.eq("code", normalized))
    .first();
  if (!coupon) {
    throw new ConvexError(`Coupon code "${normalized}" is not valid.`);
  }
  const now = Date.now();
  if (!coupon.isActive) {
    throw new ConvexError("This coupon has been deactivated.");
  }
  if (now < coupon.startDate) {
    throw new ConvexError("This coupon is not active yet.");
  }
  if (now > coupon.expiryDate) {
    throw new ConvexError("This coupon has expired.");
  }
  if (coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) {
    throw new ConvexError("This coupon has reached its usage limit.");
  }
  if (coupon.perUserLimit !== undefined) {
    const prior = await ctx.db
      .query("orders")
      .withIndex("by_buyer", (q) => q.eq("buyerId", buyerId))
      .collect();
    const used = prior.filter(
      (o) => o.couponCode === normalized && o.status !== "cancelled",
    ).length;
    if (used >= coupon.perUserLimit) {
      throw new ConvexError("You have already used this coupon.");
    }
  }
  const allSubtotal = items.reduce((s, i) => s + i.discountedSubtotal, 0);
  if (allSubtotal < coupon.minOrderValue) {
    throw new ConvexError(
      `This coupon needs a minimum order of ₹${coupon.minOrderValue}.`,
    );
  }
  if (coupon.newBuyerOnly) {
    const prior = await ctx.db
      .query("orders")
      .withIndex("by_buyer", (q) => q.eq("buyerId", buyerId))
      .first();
    if (prior) {
      throw new ConvexError("This coupon is for first orders only.");
    }
  }
  // scope the coupon to eligible items
  let eligibleItems = items;
  if (coupon.categoryRestriction) {
    eligibleItems = eligibleItems.filter(
      (i) => i.category === coupon.categoryRestriction,
    );
  }
  if (coupon.productRestrictions && coupon.productRestrictions.length > 0) {
    eligibleItems = eligibleItems.filter((i) =>
      coupon.productRestrictions!.includes(i.productId),
    );
  }
  if (coupon.farmerRestrictions && coupon.farmerRestrictions.length > 0) {
    eligibleItems = eligibleItems.filter((i) =>
      coupon.farmerRestrictions!.includes(i.farmerId),
    );
  }
  const eligibleSubtotal = eligibleItems.reduce((s, i) => s + i.discountedSubtotal, 0);
  if (eligibleSubtotal <= 0) {
    throw new ConvexError(
      "This coupon does not apply to any item in your basket.",
    );
  }
  let discount =
    coupon.type === "percent"
      ? Math.round((eligibleSubtotal * coupon.value) / 100)
      : coupon.value;
  if (coupon.maxDiscount > 0) discount = Math.min(discount, coupon.maxDiscount);
  discount = Math.min(discount, eligibleSubtotal);
  return { coupon, discount, eligibleSubtotal };
}

export const validateCouponFor = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    // Returns the public coupon summary only; real validation happens inside
    // the checkout quote / placement with full item context.
    const user = await requireUser(ctx);
    const coupon = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim().toUpperCase()))
      .first();
    if (!coupon) throw new ConvexError("Coupon code not found.");
    const now = Date.now();
    if (!coupon.isActive) throw new ConvexError("Coupon is deactivated.");
    if (now < coupon.startDate) throw new ConvexError("Coupon not started yet.");
    if (now > coupon.expiryDate) throw new ConvexError("Coupon has expired.");
    const used = coupon.usageLimit !== undefined ? coupon.usageCount : 0;
    if (coupon.usageLimit !== undefined && used >= coupon.usageLimit) {
      throw new ConvexError("Coupon usage limit reached.");
    }
    void user;
    return {
      code: coupon.code,
      title: coupon.title,
      description: coupon.description,
      type: coupon.type,
      value: coupon.value,
      minOrderValue: coupon.minOrderValue,
      maxDiscount: coupon.maxDiscount,
    };
  },
});

/** Active public coupons (shown on the marketing page + checkout hint). */
export const listPublicCoupons = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const docs = await ctx.db.query("coupons").collect();
    return docs
      .filter((c) => c.isActive && c.startDate <= now && c.expiryDate >= now)
      .map((c) => ({
        code: c.code,
        title: c.title,
        description: c.description,
        type: c.type,
        value: c.value,
        minOrderValue: c.minOrderValue,
        maxDiscount: c.maxDiscount,
        expiryDate: c.expiryDate,
      }));
  },
});

// ─────────────────────────── admin CRUD ───────────────────────────

export const adminListCoupons = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    const docs = await ctx.db.query("coupons").collect();
    return docs.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const adminSaveCoupon = mutation({
  args: {
    id: v.optional(v.id("coupons")),
    code: v.string(),
    title: v.string(),
    description: v.string(),
    type: v.union(v.literal("percent"), v.literal("fixed")),
    value: v.number(),
    minOrderValue: v.number(),
    maxDiscount: v.number(),
    categoryRestriction: v.optional(v.string()),
    newBuyerOnly: v.boolean(),
    startDate: v.number(),
    expiryDate: v.number(),
    usageLimit: v.optional(v.number()),
    perUserLimit: v.optional(v.number()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const code = args.code.trim().toUpperCase().replace(/\s+/g, "");
    if (code.length < 3) throw new ConvexError("Code too short.");
    if (args.value <= 0) throw new ConvexError("Value must be positive.");
    if (args.expiryDate <= args.startDate) {
      throw new ConvexError("Expiry must be after the start date.");
    }
    let categoryRestriction: Category | undefined;
    if (args.categoryRestriction) {
      if (!CATEGORIES.includes(args.categoryRestriction as Category)) {
        throw new ConvexError("Unknown product category for this coupon.");
      }
      categoryRestriction = args.categoryRestriction as Category;
    }
    const existing = await ctx.db
      .query("coupons")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();
    if (args.id) {
      const doc = await ctx.db.get(args.id);
      if (!doc) throw new ConvexError("Coupon not found.");
      if (existing && existing._id !== args.id) {
        throw new ConvexError("A coupon with this code already exists.");
      }
      await ctx.db.patch(args.id, {
        code,
        title: args.title.trim(),
        description: args.description.trim(),
        type: args.type,
        value: args.value,
        minOrderValue: args.minOrderValue,
        maxDiscount: args.maxDiscount,
        categoryRestriction,
        newBuyerOnly: args.newBuyerOnly,
        startDate: args.startDate,
        expiryDate: args.expiryDate,
        usageLimit: args.usageLimit || undefined,
        perUserLimit: args.perUserLimit || undefined,
        isActive: args.isActive,
      });
    } else {
      if (existing) {
        throw new ConvexError("A coupon with this code already exists.");
      }
      await ctx.db.insert("coupons", {
        code,
        title: args.title.trim(),
        description: args.description.trim(),
        type: args.type,
        value: args.value,
        minOrderValue: args.minOrderValue,
        maxDiscount: args.maxDiscount,
        categoryRestriction,
        newBuyerOnly: args.newBuyerOnly,
        startDate: args.startDate,
        expiryDate: args.expiryDate,
        usageLimit: args.usageLimit || undefined,
        perUserLimit: args.perUserLimit || undefined,
        isActive: args.isActive,
        usageCount: 0,
        createdAt: Date.now(),
      });
    }
    return { ok: true };
  },
});

export const adminToggleCoupon = mutation({
  args: { id: v.id("coupons") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new ConvexError("Coupon not found.");
    await ctx.db.patch(args.id, { isActive: !doc.isActive });
    return { ok: true };
  },
});

export const adminDeleteCoupon = mutation({
  args: { id: v.id("coupons") },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const doc = await ctx.db.get(args.id);
    if (!doc) throw new ConvexError("Coupon not found.");
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});
