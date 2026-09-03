// Internal primitives used by the demo seeder action (see seed.ts).
// Kept in their own module so the action can call them through
// `internal.seedHelpers.*` without type-registry cycles.
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { CROP_CATALOG } from "./catalog";
import type { Id } from "./_generated/dataModel";

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;
let state = 20260817;
const rand = (min: number, max: number) => {
  state = (state * 1103515245 + 12345) & 0x7fffffff;
  return (state % (max - min + 1)) + min;
};

export const slugToCrop = new Map(CROP_CATALOG.map((c) => [c.slug, c]));

export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => ctx.db.get(args.userId),
});

export const tableCounts = internalQuery({
  args: {},
  handler: async (ctx) => {
    const [crops, farmers, products] = await Promise.all([
      ctx.db.query("crops").collect(),
      ctx.db.query("farmers").collect(),
      ctx.db.query("products").collect(),
    ]);
    return {
      crops: crops.length,
      farmers: farmers.length,
      products: products.length,
    };
  },
});

export const wipeAll = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "inquiries",
      "notifications",
      "reviews",
      "wishlistItems",
      "cartItems",
      "orders",
      "products",
      "coupons",
      "farmers",
      "crops",
      "settings",
    ] as const;
    for (const table of tables) {
      while (true) {
        const docs = await ctx.db.query(table).collect();
        if (docs.length === 0) break;
        for (let i = 0; i < docs.length; i += 30) {
          await Promise.all(
            docs.slice(i, i + 30).map((d) => ctx.db.delete(d._id)),
          );
        }
        if (docs.length < 100) break;
      }
    }
    return { ok: true };
  },
});

export const insertCropsAndSettings = internalMutation({
  args: { crops: v.array(v.any()), settings: v.any() },
  handler: async (ctx, args) => {
    const ids: { slug: string; id: Id<"crops"> }[] = [];
    for (const c of args.crops as (typeof CROP_CATALOG)[number][]) {
      const id = await ctx.db.insert("crops", {
        name: c.name,
        slug: c.slug,
        category: c.category,
        subcategory: c.subcategory,
        emoji: c.emoji,
        tint: c.tint,
        unit: c.unit,
        marketPrice: c.marketPrice,
        shelfLifeDays: c.shelfLifeDays,
        description: c.description,
        organicDefault: c.organicDefault,
      });
      ids.push({ slug: c.slug, id });
    }
    await ctx.db.insert("settings", args.settings);
    return ids;
  },
});

export type FarmerSeed = {
  name: string;
  farmName: string;
  village: string;
  district: string;
  state: string;
  bio: string;
  yearsFarming: number;
  verified: boolean;
};

export type ProductSeed = {
  cropSlug: string;
  marketPrice: number;
  grade: string;
  organic: boolean;
  description: string;
  stockQty: number;
  initialStock: number;
  minOrderQty: number;
  harvestDate: number;
  soldQty: number;
  createdAt: number;
};

export const insertFarmerBatch = internalMutation({
  args: { farmers: v.array(v.any()), products: v.array(v.array(v.any())) },
  handler: async (ctx, args) => {
    const farmers = args.farmers as FarmerSeed[];
    const products = args.products as ProductSeed[][];
    const out: { farmerId: Id<"farmers">; productIds: Id<"products">[] }[] = [];
    for (let i = 0; i < farmers.length; i++) {
      const f = farmers[i];
      const farmerId = await ctx.db.insert("farmers", {
        name: f.name,
        farmName: f.farmName,
        village: f.village,
        district: f.district,
        state: f.state,
        phone: undefined,
        bio: f.bio,
        yearsFarming: f.yearsFarming,
        verified: f.verified,
        isDemo: true,
        ratingAvg: 0,
        ratingCount: 0,
        createdAt: NOW - rand(60, 400) * DAY,
      });
      const productIds: Id<"products">[] = [];
      for (const p of products[i] ?? []) {
        const crop = slugToCrop.get(p.cropSlug)!;
        const id = await ctx.db.insert("products", {
          farmerId,
          cropId: undefined,
          name: crop.name,
          emoji: crop.emoji,
          tint: crop.tint,
          category: crop.category,
          subcategory: crop.subcategory,
          unit: crop.unit,
          marketPrice: p.marketPrice,
          grade: p.grade,
          organic: p.organic,
          description: p.description,
          imageUrl: undefined,
          stockQty: p.stockQty,
          initialStock: p.initialStock,
          minOrderQty: p.minOrderQty,
          harvestDate: p.harvestDate,
          shelfLifeDays: crop.shelfLifeDays,
          soldQty: p.soldQty,
          isActive: true,
          createdAt: p.createdAt,
        });
        productIds.push(id);
      }
      out.push({ farmerId, productIds });
    }
    return out;
  },
});

export type OrderSeed = {
  number: string;
  buyerName: string;
  city: string;
  state: string;
  pin: string;
  farmerId: Id<"farmers">;
  items: {
    productId: Id<"products">;
    name: string;
    emoji: string;
    unit: string;
    qty: number;
    marketPrice: number;
    unitPrice: number;
    total: number;
  }[];
  marketSubtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  platformFee: number;
  deliveryFee: number;
  total: number;
  status: string;
  timeline: { status: string; label: string; at: number }[];
  paymentMethod: string;
  paymentStatus: string;
  deliveredAt?: number;
  createdAt: number;
  review?: {
    rating: number;
    comment: string;
    reviewerName: string;
    createdAt: number;
  };
};

export const insertOrdersBatch = internalMutation({
  args: { orders: v.array(v.any()) },
  handler: async (ctx, args) => {
    const ratings: { farmerId: Id<"farmers">; sum: number; count: number }[] =
      [];
    for (const o of args.orders as OrderSeed[]) {
      const orderId = await ctx.db.insert("orders", {
        number: o.number,
        buyerId: undefined,
        buyerName: o.buyerName,
        buyerPhone: undefined,
        buyerAddress: {
          line: "12, Main Market Road",
          city: o.city,
          state: o.state,
          pincode: o.pin,
        },
        farmerId: o.farmerId,
        items: o.items,
        marketSubtotal: o.marketSubtotal,
        discountAmount: o.discountAmount,
        discountedSubtotal: o.discountedSubtotal,
        couponCode: undefined,
        couponDiscount: 0,
        deliveryFee: o.deliveryFee,
        platformFee: o.platformFee,
        total: o.total,
        status: o.status as never,
        timeline: o.timeline,
        paymentMethod: o.paymentMethod as never,
        paymentStatus: o.paymentStatus,
        paymentRef: o.paymentStatus === "paid" ? `DEMO-${o.number}` : undefined,
        isDemo: true,
        buyerNote: undefined,
        deliveredAt: o.deliveredAt,
        createdAt: o.createdAt,
      });
      if (o.review) {
        await ctx.db.insert("reviews", {
          orderId,
          productId: o.items[0]?.productId,
          farmerId: o.farmerId,
          buyerId: undefined,
          reviewerName: o.review.reviewerName,
          rating: o.review.rating,
          comment: o.review.comment,
          createdAt: o.review.createdAt,
        });
        const idx = ratings.findIndex((r) => r.farmerId === o.farmerId);
        if (idx >= 0) {
          ratings[idx].sum += o.review.rating;
          ratings[idx].count += 1;
        } else {
          ratings.push({
            farmerId: o.farmerId,
            sum: o.review.rating,
            count: 1,
          });
        }
      }
    }
    return ratings;
  },
});

export const insertCoupons = internalMutation({
  args: { coupons: v.array(v.any()) },
  handler: async (ctx, args) => {
    for (const c of args.coupons) {
      await ctx.db.insert("coupons", c);
    }
    return { ok: true };
  },
});

export const applyRatings = internalMutation({
  args: { ratings: v.array(v.any()) },
  handler: async (ctx, args) => {
    for (const r of args.ratings as {
      farmerId: Id<"farmers">;
      sum: number;
      count: number;
    }[]) {
      const avg = r.count > 0 ? Math.round((r.sum / r.count) * 100) / 100 : 0;
      await ctx.db.patch(r.farmerId, { ratingAvg: avg, ratingCount: r.count });
    }
    return { ok: true };
  },
});
