// Public marketplace: crop catalogue, listing browse + detail, stats.
import { v } from "convex/values";
import { query, QueryCtx } from "./_generated/server";
import { getPlatformSettings, type PlatformSettings } from "./settings";
import type { Doc, Id } from "./_generated/dataModel";

// ─────────────────────────── shared helpers ───────────────────────────

export type ProductDoc = Doc<"products">;
export type FarmerDoc = Doc<"farmers">;

export const roundInr = (n: number) => Math.round(n);

/** Selling price maths. unitPrice = marketPrice less marketDiscountPercent. */
export function priceBreakdown(marketPrice: number, discountPct: number) {
  const unitPrice = roundInr(marketPrice * (1 - discountPct / 100));
  return {
    unitPrice,
    discountAmount: marketPrice - unitPrice,
    discountPct,
  };
}

export type Availability =
  | "available"
  | "limited"
  | "upcoming"
  | "out"
  | "inactive";

export function availabilityOf(p: ProductDoc, now = Date.now()): Availability {
  if (!p.isActive) return "inactive";
  if (p.stockQty > 0) {
    const ratio = p.initialStock > 0 ? p.stockQty / p.initialStock : 1;
    // depleted below ~20% of the season's lot = limited stock
    return ratio < 0.2 ? "limited" : "available";
  }
  if (p.harvestDate > now) return "upcoming";
  return "out";
}

export type FarmerSummary = {
  id: Id<"farmers">;
  name: string;
  farmName: string;
  village: string;
  district: string;
  state: string;
  verified: boolean;
  isDemo: boolean;
  ratingAvg: number;
  ratingCount: number;
};

export type ListingRow = {
  id: Id<"products">;
  farmerId: Id<"farmers">;
  farmer: FarmerSummary;
  cropId?: Id<"crops">;
  name: string;
  emoji: string;
  tint: number;
  category: string;
  subcategory: string;
  unit: string;
  grade: string;
  organic: boolean;
  imageUrl?: string;
  marketPrice: number;
  unitPrice: number;
  discountPct: number;
  stockQty: number;
  initialStock: number;
  minOrderQty: number;
  harvestDate: number;
  shelfLifeDays: number;
  soldQty: number;
  availability: Availability;
  createdAt: number;
};

export async function buildListingRows(
  ctx: QueryCtx,
  products: ProductDoc[],
  settings: PlatformSettings,
): Promise<ListingRow[]> {
  const farmerIds = new Set(products.map((p) => p.farmerId));
  const farmers = new Map<Id<"farmers">, FarmerDoc>();
  if (farmerIds.size > 0) {
    const docs = await ctx.db.query("farmers").collect();
    for (const f of docs) {
      if (farmerIds.has(f._id)) farmers.set(f._id, f);
    }
  }
  const now = Date.now();
  const rows: ListingRow[] = [];
  for (const p of products) {
    const farmer = farmers.get(p.farmerId);
    if (!farmer) continue;
    const { unitPrice, discountAmount } = priceBreakdown(
      p.marketPrice,
      settings.marketDiscountPercent,
    );
    rows.push({
      id: p._id,
      farmerId: p.farmerId,
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
      },
      cropId: p.cropId,
      name: p.name,
      emoji: p.emoji,
      tint: p.tint,
      category: p.category,
      subcategory: p.subcategory,
      unit: p.unit,
      grade: p.grade,
      organic: p.organic,
      imageUrl: p.imageUrl,
      marketPrice: p.marketPrice,
      unitPrice,
      discountPct: settings.marketDiscountPercent,
      stockQty: p.stockQty,
      initialStock: p.initialStock,
      minOrderQty: p.minOrderQty,
      harvestDate: p.harvestDate,
      shelfLifeDays: p.shelfLifeDays,
      soldQty: p.soldQty,
      availability: availabilityOf(p, now),
      createdAt: p.createdAt,
    });
    void discountAmount;
  }
  return rows;
}

/** Browse the fresh marketplace with server-side filters + database search. */
export const browse = query({
  args: {
    category: v.optional(v.string()),
    farmerId: v.optional(v.id("farmers")),
    search: v.optional(v.string()),
    onlyAvailable: v.optional(v.boolean()),
    organicOnly: v.optional(v.boolean()),
    verifiedOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const settings = await getPlatformSettings(ctx);
    let products = await ctx.db
      .query("products")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    if (args.category) {
      products = products.filter((p) => p.category === args.category);
    }
    if (args.farmerId) {
      products = products.filter((p) => p.farmerId === args.farmerId);
    }
    if (args.organicOnly) {
      products = products.filter((p) => p.organic);
    }
    const queryText = args.search?.trim().toLowerCase();
    if (queryText) {
      // database-side text search across product name/category/subcategory
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(queryText) ||
          p.category.toLowerCase().includes(queryText) ||
          p.subcategory.toLowerCase().includes(queryText) ||
          p.grade.toLowerCase().includes(queryText),
      );
    }
    const rows = await buildListingRows(ctx, products, settings);
    const now = Date.now();
    let out = rows;
    if (args.onlyAvailable) {
      out = out.filter((r) => r.availability === "available");
    }
    if (args.verifiedOnly) {
      out = out.filter((r) => r.farmer.verified);
    }
    void now;
    return { settings, rows: out };
  },
});

/** Everything one farmer currently sells (used by the public farm page). */
export const farmerListings = query({
  args: { farmerId: v.id("farmers") },
  handler: async (ctx, args) => {
    const settings = await getPlatformSettings(ctx);
    const products = await ctx.db
      .query("products")
      .withIndex("by_farmer", (q) => q.eq("farmerId", args.farmerId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    return buildListingRows(ctx, products, settings);
  },
});

export type ProductDetail = {
  listing: ListingRow;
  description: string;
  reviewsSummary: { ratingAvg: number; count: number };
  related: ListingRow[];
};

export const productDetail = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args): Promise<ProductDetail | null> => {
    const settings = await getPlatformSettings(ctx);
    const product = await ctx.db.get(args.productId);
    if (!product) return null;
    const [rows, reviews] = await Promise.all([
      buildListingRows(ctx, [product], settings),
      ctx.db
        .query("reviews")
        .withIndex("by_farmer", (q) => q.eq("farmerId", product.farmerId))
        .collect(),
    ]);
    const listing = rows[0];
    if (!listing) return null;
    const ratingAvg =
      reviews.length > 0
        ? Math.round(
            (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10,
          ) / 10
        : 0;
    // related: same category from other farmers
    const candidates = (
      await ctx.db.query("products").collect()
    ).filter(
      (p) =>
        p.isActive &&
        p.category === product.category &&
        p._id !== product._id,
    );
    const related = (
      await buildListingRows(ctx, candidates.slice(0, 60), settings)
    ).slice(0, 8);
    return {
      listing,
      description: product.description,
      reviewsSummary: { ratingAvg, count: reviews.length },
      related,
    };
  },
});

export const topSelling = query({
  args: {},
  handler: async (ctx) => {
    const settings = await getPlatformSettings(ctx);
    const products = (await ctx.db.query("products").collect())
      .filter((p) => p.isActive)
      .sort((a, b) => b.soldQty - a.soldQty)
      .slice(0, 12);
    const rows = await buildListingRows(ctx, products, settings);
    // available first so the strip stays buyable
    rows.sort((a, b) => {
      const rank = (av: Availability) => (av === "available" ? 0 : 1);
      return rank(a.availability) - rank(b.availability);
    });
    return rows;
  },
});

export const freshToday = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const settings = await getPlatformSettings(ctx);
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const products = (await ctx.db.query("products").collect()).filter(
      (p) => p.isActive && p.harvestDate >= now - day && p.stockQty > 0,
    );
    const rows = await buildListingRows(ctx, products, settings);
    rows.sort((a, b) => b.harvestDate - a.harvestDate);
    return rows.slice(0, args.limit ?? 8);
  },
});
