// Farmer-owned product CRUD + inventory management.
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMyFarmer } from "./seller";
import { getSessionUser } from "./profiles";
import type { Id } from "./_generated/dataModel";

export const myProducts = query({
  args: {},
  handler: async (ctx) => {
    const farmer = await requireMyFarmer(ctx);
    const products = await ctx.db
      .query("products")
      .withIndex("by_farmer", (q) => q.eq("farmerId", farmer._id))
      .collect();
    return products.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const addProduct = mutation({
  args: {
    cropId: v.id("crops"),
    marketPrice: v.number(),
    stockQty: v.number(),
    minOrderQty: v.optional(v.number()),
    grade: v.optional(v.string()),
    organic: v.optional(v.boolean()),
    harvestDate: v.optional(v.number()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const farmer = await requireMyFarmer(ctx);
    const crop = await ctx.db.get(args.cropId);
    if (!crop) throw new ConvexError("Crop not found in the catalogue.");
    if (args.marketPrice <= 0) throw new ConvexError("Price must be positive.");
    if (args.stockQty < 0) throw new ConvexError("Stock cannot be negative.");
    const now = Date.now();
    const stockQty = Math.max(0, args.stockQty);
    const id = await ctx.db.insert("products", {
      farmerId: farmer._id,
      cropId: crop._id,
      name: crop.name,
      emoji: crop.emoji,
      tint: crop.tint,
      category: crop.category,
      subcategory: crop.subcategory,
      unit: crop.unit,
      marketPrice: Math.round(args.marketPrice),
      grade: args.grade?.trim() || "Grade A",
      organic: args.organic ?? crop.organicDefault,
      description:
        args.description?.trim() ||
        `${crop.name} harvested on ${farmer.farmName}, ${farmer.village}, ${farmer.district}. Packed fresh at the farm gate.`,
      imageUrl: args.imageUrl?.trim() || undefined,
      stockQty,
      initialStock: stockQty,
      minOrderQty: Math.max(1, args.minOrderQty ?? 5),
      harvestDate: args.harvestDate ?? now,
      shelfLifeDays: crop.shelfLifeDays,
      soldQty: 0,
      isActive: true,
      createdAt: now,
    });
    return { id };
  },
});

export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    marketPrice: v.optional(v.number()),
    stockQty: v.optional(v.number()),
    minOrderQty: v.optional(v.number()),
    grade: v.optional(v.string()),
    organic: v.optional(v.boolean()),
    harvestDate: v.optional(v.number()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const farmer = await requireMyFarmer(ctx);
    const product = await ctx.db.get(args.productId);
    if (!product || product.farmerId !== farmer._id) {
      throw new ConvexError("Product not found on your farm.");
    }
    const patch: Record<string, unknown> = {};
    if (args.marketPrice !== undefined) {
      if (args.marketPrice <= 0) throw new ConvexError("Price must be positive.");
      patch.marketPrice = Math.round(args.marketPrice);
    }
    if (args.stockQty !== undefined) {
      if (args.stockQty < 0) throw new ConvexError("Stock cannot be negative.");
      const newStock = Math.round(args.stockQty);
      patch.stockQty = newStock;
      // Restocking above the original level raises the baseline so the
      // limited-stock signal still reflects genuine depletion.
      patch.initialStock = Math.max(product.initialStock, newStock);
    }
    if (args.minOrderQty !== undefined) {
      patch.minOrderQty = Math.max(1, args.minOrderQty);
    }
    if (args.grade !== undefined) patch.grade = args.grade.trim() || product.grade;
    if (args.organic !== undefined) patch.organic = args.organic;
    if (args.harvestDate !== undefined) patch.harvestDate = args.harvestDate;
    if (args.description !== undefined) {
      patch.description = args.description.trim();
    }
    if (args.imageUrl !== undefined) {
      patch.imageUrl = args.imageUrl.trim() || undefined;
    }
    if (args.isActive !== undefined && args.isActive !== product.isActive) {
      patch.isActive = args.isActive;
      // Deactivating a listing should remove it from every cart/wishlist so
      // nobody hits a dead listing at checkout.
      if (!args.isActive) {
        const carts = await ctx.db
          .query("cartItems")
          .filter((q) => q.eq(q.field("productId"), args.productId))
          .collect();
        for (const c of carts) await ctx.db.delete(c._id);
        const wl = await ctx.db
          .query("wishlistItems")
          .filter((q) => q.eq(q.field("productId"), args.productId))
          .collect();
        for (const w of wl) await ctx.db.delete(w._id);
      }
    }
    await ctx.db.patch(product._id, patch);
    return { ok: true };
  },
});

export const adjustStock = mutation({
  args: { productId: v.id("products"), delta: v.number() },
  handler: async (ctx, args) => {
    const farmer = await requireMyFarmer(ctx);
    const product = await ctx.db.get(args.productId);
    if (!product || product.farmerId !== farmer._id) {
      throw new ConvexError("Product not found on your farm.");
    }
    const stockQty = Math.max(0, product.stockQty + Math.round(args.delta));
    await ctx.db.patch(product._id, {
      stockQty,
      initialStock: Math.max(product.initialStock, stockQty),
    });
    // low-stock alert for the owner when crossing the depletion threshold
    if (
      stockQty > 0 &&
      stockQty <= Math.max(2 * product.minOrderQty, 150) &&
      farmer.userId
    ) {
      await ctx.db.insert("notifications", {
        userId: farmer.userId,
        kind: "low_stock",
        title: `Low stock: ${product.name}`,
        body: `Only ${stockQty} ${product.unit} left of ${product.name}. Restock to keep it listed.`,
        link: "/farmer/products",
        read: false,
        createdAt: Date.now(),
      });
    }
    return { stockQty };
  },
});

export const removeListing = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const farmer = await requireMyFarmer(ctx);
    const product = await ctx.db.get(args.productId);
    if (!product || product.farmerId !== farmer._id) {
      throw new ConvexError("Product not found on your farm.");
    }
    await ctx.db.patch(product._id, { isActive: false });
    const carts = await ctx.db
      .query("cartItems")
      .filter((q) => q.eq(q.field("productId"), args.productId))
      .collect();
    for (const c of carts) await ctx.db.delete(c._id);
    return { ok: true };
  },
});

export const productOwnership = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const farmer = await requireMyFarmer(ctx).catch(() => null);
    if (!farmer) return false;
    const p = await ctx.db.get(args.productId);
    return p?.farmerId === farmer._id;
  },
});

export const getProductForEdit = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const farmer = await requireMyFarmer(ctx);
    const p = await ctx.db.get(args.productId);
    if (!p || p.farmerId !== farmer._id) return null;
    return p;
  },
});

// ─────────────── wishlist (any signed-in user) ───────────────

export const toggleWishlist = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const user = await getSessionUser(ctx);
    if (!user) throw new ConvexError("Sign in to save crops.");
    const existing = await ctx.db
      .query("wishlistItems")
      .withIndex("by_user_product", (q) =>
        q
          .eq("userId", user._id)
          .eq("productId", args.productId),
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
      return { saved: false };
    }
    await ctx.db.insert("wishlistItems", {
      userId: user._id,
      productId: args.productId,
      createdAt: Date.now(),
    });
    return { saved: true };
  },
});

export const isWishlisted = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    const user = await getSessionUser(ctx);
    if (!user) return false;
    const existing = await ctx.db
      .query("wishlistItems")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId),
      )
      .first();
    return existing !== null;
  },
});
