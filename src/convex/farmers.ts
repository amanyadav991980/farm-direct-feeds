// Farmer identities: public profiles, featured farmers, own-farm queries.
import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./profiles";
import {
  buildListingRows,
  type FarmerSummary,
} from "./marketplace";
import { getPlatformSettings } from "./settings";
import type { Doc, Id } from "./_generated/dataModel";

export const featuredFarmers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const farmers = (await ctx.db.query("farmers").collect())
      .filter((f) => f.verified)
      .sort(
        (a, b) =>
          b.ratingCount - a.ratingCount || b.ratingAvg - a.ratingAvg,
      )
      .slice(0, args.limit ?? 8);
    const products = await ctx.db.query("products").collect();
    return farmers.map((f) => {
      const farmProducts = products.filter(
        (p) => p.farmerId === f._id && p.isActive,
      );
      const top = [...farmProducts]
        .sort((a, b) => b.soldQty - a.soldQty)
        .slice(0, 3);
      return {
        id: f._id,
        name: f.name,
        farmName: f.farmName,
        village: f.village,
        district: f.district,
        state: f.state,
        verified: f.verified,
        isDemo: f.isDemo,
        ratingAvg: f.ratingAvg,
        ratingCount: f.ratingCount,
        yearsFarming: f.yearsFarming,
        bio: f.bio ?? "",
        productCount: farmProducts.length,
        topCrops: top.map((p) => ({ name: p.name, emoji: p.emoji })),
      };
    });
  },
});

export const farmerLocation = query({
  args: { farmerId: v.id("farmers") },
  handler: async (ctx, args) => {
    const farmer = await ctx.db.get(args.farmerId);
    if (!farmer) return null;
    return {
      id: farmer._id,
      name: farmer.name,
      farmName: farmer.farmName,
      village: farmer.village,
      district: farmer.district,
      state: farmer.state,
    };
  },
});

export const publicFarmer = query({
  args: { farmerId: v.id("farmers") },
  handler: async (ctx, args) => {
    const farmer = await ctx.db.get(args.farmerId);
    if (!farmer) return null;
    const settings = await getPlatformSettings(ctx);
    const [allProducts, allOrders, allReviews] = await Promise.all([
      ctx.db.query("products").collect(),
      ctx.db.query("orders").collect(),
      ctx.db.query("reviews").collect(),
    ]);
    const farmProducts = allProducts.filter(
      (p) => p.farmerId === farmer._id && p.isActive,
    );
    const orders = allOrders.filter((o) => o.farmerId === farmer._id);
    const delivered = orders.filter((o) => o.status === "delivered");
    const reviews = allReviews
      .filter((r) => r.farmerId === farmer._id)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 6);
    const rows = await buildListingRows(ctx, farmProducts, settings);
    return {
      farmer: {
        id: farmer._id,
        name: farmer.name,
        farmName: farmer.farmName,
        village: farmer.village,
        district: farmer.district,
        state: farmer.state,
        verified: farmer.verified,
        isDemo: farmer.isDemo,
        ratingAvg: farmer.ratingAvg,
        ratingCount: farmer.ratingCount,
        yearsFarming: farmer.yearsFarming,
        bio: farmer.bio ?? "",
        createdAt: farmer.createdAt,
        hasAccount: farmer.userId !== undefined,
      } as FarmerSummary & {
        yearsFarming: number;
        bio: string;
        createdAt: number;
        hasAccount: boolean;
      },
      products: rows,
      reviews: reviews.map((r) => ({
        id: r._id,
        reviewerName: r.reviewerName,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      })),
      stats: {
        productCount: farmProducts.length,
        soldQty: farmProducts.reduce((s, p) => s + p.soldQty, 0),
        deliveredCount: delivered.length,
        grossSales: delivered.reduce((s, o) => s + o.total, 0),
      },
    };
  },
});

/** The farmer row belonging to the signed-in farmer (null otherwise). */
export const myFarm = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (user.role !== "farmer") return null;
    const farmer = await ctx.db
      .query("farmers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!farmer) return null;
    return {
      id: farmer._id,
      name: farmer.name,
      farmName: farmer.farmName,
      village: farmer.village,
      district: farmer.district,
      state: farmer.state,
      phone: farmer.phone ?? "",
      bio: farmer.bio ?? "",
      yearsFarming: farmer.yearsFarming,
      verified: farmer.verified,
      isDemo: farmer.isDemo,
      ratingAvg: farmer.ratingAvg,
      ratingCount: farmer.ratingCount,
      createdAt: farmer.createdAt,
    };
  },
});

export const updateFarmProfile = mutation({
  args: {
    farmName: v.optional(v.string()),
    village: v.optional(v.string()),
    district: v.optional(v.string()),
    state: v.optional(v.string()),
    phone: v.optional(v.string()),
    bio: v.optional(v.string()),
    yearsFarming: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role !== "farmer") throw new ConvexError("Farmer account required.");
    const farmer = await ctx.db
      .query("farmers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!farmer) throw new ConvexError("Farmer profile not found.");
    await ctx.db.patch(farmer._id, {
      farmName: args.farmName?.trim() || farmer.farmName,
      village: args.village?.trim() || farmer.village,
      district: args.district?.trim() || farmer.district,
      state: args.state?.trim() || farmer.state,
      phone: args.phone?.trim() || farmer.phone,
      bio: args.bio?.trim() || farmer.bio,
      yearsFarming: args.yearsFarming ?? farmer.yearsFarming,
    });
    return { ok: true };
  },
});

/** A farmer's product docs incl. inactive — used by dashboards + farm page. */
export const farmerProductsRaw = query({
  args: { farmerId: v.id("farmers") },
  handler: async (ctx, args) => {
    return ctx.db
      .query("products")
      .withIndex("by_farmer", (q) => q.eq("farmerId", args.farmerId))
      .collect();
  },
});

export type FarmerRow = Doc<"farmers">;
export type ProductRow = Doc<"products">;
