// Buyer cart — one basket per signed-in user.
import { ConvexError, v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { requireUser, getSessionUser } from "./profiles";
import { buildListingRows } from "./marketplace";
import { getPlatformSettings } from "./settings";
import type { Id } from "./_generated/dataModel";

export type CartLine = {
  cartItemId: Id<"cartItems">;
  productId: Id<"products">;
  quantity: number;
  listing: Awaited<ReturnType<typeof buildListingRows>>[number];
};

export async function fetchCartLines(
  ctx: QueryCtx,
  userId: Id<"users">,
): Promise<CartLine[]> {
  const cartItems = await ctx.db
    .query("cartItems")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  if (cartItems.length === 0) return [];
  const products = await ctx.db.query("products").collect();
  const settings = await getPlatformSettings(ctx);
  const productMap = new Map(
    products.filter((p) => p.isActive).map((p) => [p._id, p]),
  );
  const lines: CartLine[] = [];
  for (const item of cartItems) {
    const product = productMap.get(item.productId);
    if (!product) continue;
    const listing = (await buildListingRows(ctx, [product], settings))[0];
    if (!listing) continue;
    lines.push({
      cartItemId: item._id,
      productId: product._id,
      quantity: Math.min(item.quantity, Math.floor(product.stockQty) || 1),
      listing,
    });
  }
  return lines;
}

export const myCart = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return fetchCartLines(ctx, user._id);
  },
});

export const cartCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getSessionUser(ctx);
    if (!user) return 0;
    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return items.reduce((s, i) => s + i.quantity, 0);
  },
});

export const addToCart = mutation({
  args: { productId: v.id("products"), quantity: v.number() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const qty = Math.max(1, Math.round(args.quantity));
    const product = await ctx.db.get(args.productId);
    if (!product || !product.isActive) {
      throw new ConvexError("This listing is no longer active.");
    }
    if (product.stockQty <= 0) {
      throw new ConvexError("This crop is currently out of stock.");
    }
    const existing = await ctx.db
      .query("cartItems")
      .withIndex("by_user_product", (q) =>
        q.eq("userId", user._id).eq("productId", args.productId),
      )
      .first();
    const desired = (existing?.quantity ?? 0) + qty;
    const allowed = Math.min(desired, Math.floor(product.stockQty));
    if (existing) {
      await ctx.db.patch(existing._id, {
        quantity: allowed,
        addedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("cartItems", {
        userId: user._id,
        productId: args.productId,
        quantity: allowed,
        addedAt: Date.now(),
      });
    }
    return { quantity: allowed };
  },
});

export const setCartQuantity = mutation({
  args: { cartItemId: v.id("cartItems"), quantity: v.number() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.cartItemId);
    if (!item || item.userId !== user._id) {
      throw new ConvexError("Cart item not found.");
    }
    const product = await ctx.db.get(item.productId);
    const max = product ? Math.floor(product.stockQty) : 0;
    if (args.quantity <= 0) {
      await ctx.db.delete(item._id);
      return { removed: true };
    }
    await ctx.db.patch(item._id, {
      quantity: Math.min(Math.round(args.quantity), Math.max(1, max)),
    });
    return { removed: false };
  },
});

export const removeFromCart = mutation({
  args: { cartItemId: v.id("cartItems") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const item = await ctx.db.get(args.cartItemId);
    if (!item || item.userId !== user._id) {
      throw new ConvexError("Cart item not found.");
    }
    await ctx.db.delete(item._id);
    return { ok: true };
  },
});
