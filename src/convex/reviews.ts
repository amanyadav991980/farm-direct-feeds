// Ratings & reviews — buyers review delivered orders.
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./profiles";
import type { Doc, Id } from "./_generated/dataModel";

export const addReview = mutation({
  args: {
    orderId: v.id("orders"),
    rating: v.number(),
    comment: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found.");
    if (order.buyerId !== user._id) {
      throw new ConvexError("You can only review your own orders.");
    }
    if (order.status !== "delivered") {
      throw new ConvexError("Reviews open once the order is delivered.");
    }
    const rating = Math.round(args.rating);
    if (rating < 1 || rating > 5) {
      throw new ConvexError("Rating must be between 1 and 5.");
    }
    const comment = args.comment.trim();
    if (comment.length < 4) {
      throw new ConvexError("Add a short comment to your review.");
    }
    const prior = await ctx.db
      .query("reviews")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .first();
    if (prior) throw new ConvexError("You already reviewed this order.");

    const farmer = await ctx.db.get(order.farmerId);
    if (!farmer) throw new ConvexError("Farmer not found.");

    await ctx.db.insert("reviews", {
      orderId: args.orderId,
      productId: order.items[0]?.productId,
      farmerId: order.farmerId,
      buyerId: user._id,
      reviewerName: user.name ?? "Verified buyer",
      rating,
      comment,
      createdAt: Date.now(),
    });

    // recompute farmer rating average
    const sum = farmer.ratingAvg * farmer.ratingCount + rating;
    const count = farmer.ratingCount + 1;
    await ctx.db.patch(farmer._id, {
      ratingAvg: Math.round((sum / count) * 100) / 100,
      ratingCount: count,
    });

    if (farmer.userId) {
      await ctx.db.insert("notifications", {
        userId: farmer.userId,
        kind: "review",
        title: `New ${rating}-star review`,
        body: `“${comment.slice(0, 90)}”`,
        link: undefined,
        read: false,
        createdAt: Date.now(),
      });
    }
    return { ok: true };
  },
});

export const reviewsByFarmer = query({
  args: { farmerId: v.id("farmers") },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("reviews")
      .withIndex("by_farmer", (q) => q.eq("farmerId", args.farmerId))
      .collect();
    return reviews
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => ({
        id: r._id,
        reviewerName: r.reviewerName,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
      }));
  },
});

/** Reviewed order ids of the current buyer (so UIs can hide review buttons). */
export const reviewedOrders = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const reviews = await ctx.db
      .query("reviews")
      .filter((q) => q.eq(q.field("buyerId"), user._id))
      .collect();
    return reviews.map((r) => r.orderId);
  },
});

export type ReviewDoc = Doc<"reviews">;
export type OrderId = Id<"orders">;
