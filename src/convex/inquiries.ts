// Secure in-platform contact — no phone numbers are exposed publicly.
import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./profiles";
import { requireMyFarmer } from "./seller";
import type { Id } from "./_generated/dataModel";

export const sendInquiry = mutation({
  args: {
    farmerId: v.id("farmers"),
    productId: v.optional(v.id("products")),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const msg = args.message.trim();
    if (msg.length < 10) {
      throw new ConvexError("Tell the farmer a little more (10+ characters).");
    }
    const farmer = await ctx.db.get(args.farmerId);
    if (!farmer) throw new ConvexError("Farmer not found.");
    const now = Date.now();
    const id = await ctx.db.insert("inquiries", {
      farmerId: args.farmerId,
      productId: args.productId,
      buyerId: user._id,
      buyerName: user.name ?? "Buyer",
      message: msg,
      handled: false,
      createdAt: now,
    });
    if (farmer.userId) {
      await ctx.db.insert("notifications", {
        userId: farmer.userId,
        kind: "inquiry",
        title: `New inquiry from ${user.name ?? "a buyer"}`,
        body: msg.slice(0, 110),
        link: "/farmer/inquiries",
        read: false,
        createdAt: now,
      });
    }
    return { id };
  },
});

export const myInquiries = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const docs = await ctx.db.query("inquiries").collect();
    const mine = docs
      .filter((d) => d.buyerId === user._id)
      .sort((a, b) => b.createdAt - a.createdAt);
    const farmers = new Map<Id<"farmers">, { name: string; farmName: string }>();
    for (const d of mine) {
      if (!farmers.has(d.farmerId)) {
        const f = await ctx.db.get(d.farmerId);
        if (f) farmers.set(d.farmerId, { name: f.name, farmName: f.farmName });
      }
    }
    return mine.map((d) => ({
      id: d._id,
      farmer: farmers.get(d.farmerId) ?? { name: "Farmer", farmName: "" },
      productId: d.productId,
      message: d.message,
      handled: d.handled,
      createdAt: d.createdAt,
    }));
  },
});

export const farmInquiries = query({
  args: {},
  handler: async (ctx) => {
    const farmer = await requireMyFarmer(ctx);
    const docs = await ctx.db
      .query("inquiries")
      .withIndex("by_farmer", (q) => q.eq("farmerId", farmer._id))
      .collect();
    return docs
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((d) => ({
        id: d._id,
        buyerName: d.buyerName,
        productId: d.productId,
        message: d.message,
        handled: d.handled,
        createdAt: d.createdAt,
      }));
  },
});

export const markInquiryHandled = mutation({
  args: { id: v.id("inquiries") },
  handler: async (ctx, args) => {
    const farmer = await requireMyFarmer(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc || doc.farmerId !== farmer._id) {
      throw new ConvexError("Inquiry not found.");
    }
    await ctx.db.patch(args.id, { handled: !doc.handled });
    return { ok: true };
  },
});
