// Orders: quote, checkout (order placement) and the order status flow.
import { ConvexError, v } from "convex/values";
import { mutation, query, QueryCtx, MutationCtx } from "./_generated/server";
import { requireUser } from "./profiles";
import { myFarmerOrNull, requireMyFarmer } from "./seller";
import { fetchCartLines } from "./cart";
import { getPlatformSettings } from "./settings";
import { evaluateCouponCode } from "./coupons";
import { roundInr } from "./marketplace";
import type { Doc, Id } from "./_generated/dataModel";

export type QuoteLine = {
  productId: Id<"products">;
  name: string;
  emoji: string;
  unit: string;
  qty: number;
  marketPrice: number;
  unitPrice: number;
  total: number;
  stockQty: number;
  category: string;
};

export type QuoteGroup = {
  farmerId: Id<"farmers">;
  farmerName: string;
  farmerLocation: string;
  lines: QuoteLine[];
  marketSubtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  platformFee: number;
  deliveryFee: number;
  couponDiscount: number;
  total: number;
};

export type Quote = {
  groups: QuoteGroup[];
  itemCount: number;
  marketSubtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  platformFee: number;
  deliveryFee: number;
  couponDiscount: number;
  total: number;
  coupon: { code: string; title: string } | null;
};

const STATUS_LABELS: Record<string, string> = {
  placed: "Order placed — awaiting farmer confirmation",
  confirmed: "Farmer confirmed the order",
  out_for_delivery: "Order is out for delivery",
  delivered: "Order delivered",
  cancelled: "Order cancelled",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

async function buildQuote(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  couponCode?: string,
): Promise<Quote> {
  const lines = await fetchCartLines(ctx, userId);
  const settings = await getPlatformSettings(ctx);
  const farmers = await ctx.db.query("farmers").collect();
  const farmerMap = new Map<Id<"farmers">, (typeof farmers)[number]>(
    farmers.map((f) => [f._id, f]),
  );

  // group lines by farmer
  const grouped = new Map<Id<"farmers">, QuoteLine[]>();
  for (const line of lines) {
    const list = grouped.get(line.listing.farmerId) ?? [];
    list.push({
      productId: line.productId,
      name: line.listing.name,
      emoji: line.listing.emoji,
      unit: line.listing.unit,
      qty: line.quantity,
      marketPrice: line.listing.marketPrice,
      unitPrice: line.listing.unitPrice,
      total: line.listing.unitPrice * line.quantity,
      stockQty: line.listing.stockQty,
      category: line.listing.category,
    });
    grouped.set(line.listing.farmerId, list);
  }

  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);
  let marketSubtotal = 0;
  let discountedSubtotal = 0;

  const groups: QuoteGroup[] = [];
  for (const [farmerId, glines] of grouped) {
    const farmer = farmerMap.get(farmerId);
    const gMarket = glines.reduce((s, l) => s + l.marketPrice * l.qty, 0);
    const gDiscounted = glines.reduce((s, l) => s + l.total, 0);
    const feePct = settings.platformFeePercent / 100;
    const group: QuoteGroup = {
      farmerId,
      farmerName: farmer?.name ?? "Farmer",
      farmerLocation: farmer
        ? `${farmer.village}, ${farmer.district}, ${farmer.state}`
        : "",
      lines: glines,
      marketSubtotal: gMarket,
      discountAmount: roundInr(gMarket - gDiscounted),
      discountedSubtotal: roundInr(gDiscounted),
      platformFee: roundInr(gDiscounted * feePct),
      deliveryFee: settings.deliveryFee,
      couponDiscount: 0,
      total: 0,
    };
    groups.push(group);
    marketSubtotal += gMarket;
    discountedSubtotal += gDiscounted;
  }
  if (groups.length === 0) {
    throw new ConvexError("Your cart is empty.");
  }

  // coupon validation (server-side only)
  let couponDiscount = 0;
  let coupon: { code: string; title: string } | null = null;
  if (couponCode?.trim()) {
    const couponItems = groups.flatMap((g) =>
      g.lines.map((l) => ({
        category: l.category,
        farmerId: g.farmerId,
        productId: l.productId,
        discountedSubtotal: l.total,
      })),
    );
    const result = await evaluateCouponCode(
      ctx,
      couponCode,
      couponItems,
      userId,
    );
    if (result.coupon) {
      couponDiscount = result.discount;
      coupon = {
        code: result.coupon.code,
        title: result.coupon.title,
      };
      // spread across farmer groups proportionally to their share
      let remaining = couponDiscount;
      const shares = groups.map((g) => ({
        group: g,
        share: 0,
      }));
      if (discountedSubtotal > 0) {
        for (const s of shares) {
          s.share = Math.floor(
            (s.group.discountedSubtotal / discountedSubtotal) * couponDiscount,
          );
          remaining -= s.share;
        }
        for (const s of shares) {
          if (remaining <= 0) break;
          s.share += 1;
          remaining -= 1;
        }
        // any residue lands on the first group
        if (remaining > 0) shares[0].share += remaining;
      }
      shares.forEach(({ group, share }) => {
        group.couponDiscount = share;
      });
    }
  }

  let deliveryTotal = 0;
  let feeTotal = 0;
  for (const g of groups) {
    g.total =
      g.discountedSubtotal -
      g.couponDiscount +
      g.platformFee +
      g.deliveryFee;
    deliveryTotal += g.deliveryFee;
    feeTotal += g.platformFee;
  }

  return {
    groups,
    itemCount,
    marketSubtotal: roundInr(marketSubtotal),
    discountAmount: roundInr(marketSubtotal - discountedSubtotal),
    discountedSubtotal: roundInr(discountedSubtotal),
    platformFee: feeTotal,
    deliveryFee: deliveryTotal,
    couponDiscount,
    total: groups.reduce((s, g) => s + g.total, 0),
    coupon,
  };
}

/** Live checkout preview used by cart + checkout pages. */
export const quoteOrder = query({
  args: { couponCode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const code = args.couponCode?.trim() || undefined;
    try {
      return await buildQuote(ctx, user._id, code);
    } catch (err) {
      // A bad/expired coupon must never blank the checkout — surface it as an
      // inline preview error instead. Order placement re-validates strictly.
      if (err instanceof ConvexError) {
        return {
          couponError: err.message,
          groups: [] as QuoteGroup[],
          itemCount: 0,
          marketSubtotal: 0,
          discountAmount: 0,
          discountedSubtotal: 0,
          platformFee: 0,
          deliveryFee: 0,
          couponDiscount: 0,
          total: 0,
          coupon: null,
        };
      }
      throw err;
    }
  },
});

export const placeOrders = mutation({
  args: {
    address: v.object({
      line: v.string(),
      city: v.string(),
      state: v.string(),
      pincode: v.string(),
    }),
    phone: v.string(),
    paymentMethod: v.union(
      v.literal("demo_upi"),
      v.literal("demo_card"),
      v.literal("cod"),
    ),
    couponCode: v.optional(v.string()),
    buyerNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (user.role === "admin") {
      throw new ConvexError("Admin sessions cannot place orders.");
    }
    const addr = args.address;
    if (
      !addr.line.trim() ||
      !addr.city.trim() ||
      !addr.state.trim() ||
      !/^\d{4,6}$/.test(addr.pincode.trim())
    ) {
      throw new ConvexError("Enter a complete delivery address (valid pincode).");
    }
    if (!args.phone.trim()) {
      throw new ConvexError("Enter a contact phone number.");
    }

    const quote = await buildQuote(
      ctx,
      user._id,
      args.couponCode?.trim() || undefined,
    );

    // stock hard check + consume inventory
    for (const g of quote.groups) {
      for (const line of g.lines) {
        const product = await ctx.db.get(line.productId);
        if (!product || !product.isActive) {
          throw new ConvexError(`${line.name} is no longer available.`);
        }
        if (product.stockQty < line.qty) {
          throw new ConvexError(
            `Only ${Math.floor(product.stockQty)} ${product.unit} of ${line.name} is available right now. Reduce the quantity and try again.`,
          );
        }
      }
    }

    const now = Date.now();
    const stamp = now.toString().slice(-9);
    const orderIds: Id<"orders">[] = [];
    const numbers: string[] = [];
    const farmerOrderId = new Map<Id<"farmers">, Id<"orders">>();

    for (let i = 0; i < quote.groups.length; i++) {
      const g = quote.groups[i];
      const number = `FD-${stamp}-${i + 1}`;
      // consume inventory exactly once per order group
      for (const line of g.lines) {
        const product = await ctx.db.get(line.productId);
        if (product) {
          await ctx.db.patch(product._id, {
            stockQty: Math.max(0, product.stockQty - line.qty),
            soldQty: product.soldQty + line.qty,
          });
        }
      }
      const paymentPaid = args.paymentMethod !== "cod";
      const orderId = await ctx.db.insert("orders", {
        number,
        buyerId: user._id,
        buyerName: user.name ?? "Buyer",
        buyerPhone: args.phone.trim(),
        buyerAddress: {
          line: addr.line.trim(),
          city: addr.city.trim(),
          state: addr.state.trim(),
          pincode: addr.pincode.trim(),
        },
        farmerId: g.farmerId,
        items: g.lines.map((l) => ({
          productId: l.productId,
          name: l.name,
          emoji: l.emoji,
          unit: l.unit,
          qty: l.qty,
          marketPrice: l.marketPrice,
          unitPrice: l.unitPrice,
          total: l.total,
        })),
        marketSubtotal: g.marketSubtotal,
        discountAmount: g.discountAmount,
        discountedSubtotal: g.discountedSubtotal,
        couponCode: quote.coupon?.code,
        couponDiscount: g.couponDiscount,
        deliveryFee: g.deliveryFee,
        platformFee: g.platformFee,
        total: g.total,
        status: "placed",
        timeline: [{ status: "placed", label: statusLabel("placed"), at: now }],
        paymentMethod: args.paymentMethod,
        paymentStatus: paymentPaid ? "paid" : "pending",
        paymentRef: paymentPaid
          ? `DEMO-${number.replace(/-/g, "")}`
          : undefined,
        isDemo: false,
        buyerNote: args.buyerNote?.trim() || undefined,
        createdAt: now,
      });
      orderIds.push(orderId);
      numbers.push(number);
      farmerOrderId.set(g.farmerId, orderId);
    }

    // record coupon usage
    if (quote.coupon) {
      const couponDoc = await ctx.db
        .query("coupons")
        .withIndex("by_code", (q) => q.eq("code", quote.coupon!.code))
        .first();
      if (couponDoc) {
        await ctx.db.patch(couponDoc._id, {
          usageCount: couponDoc.usageCount + 1,
        });
      }
    }

    // clear the basket + notify
    const cart = await ctx.db
      .query("cartItems")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const c of cart) await ctx.db.delete(c._id);

    const first = orderIds[0];
    if (first) {
      await ctx.db.insert("notifications", {
        userId: user._id,
        kind: "order_status",
        title: `Order ${numbers.length > 1 ? "s" : ""} placed`,
        body:
          numbers.length > 1
            ? `Your basket was split into ${numbers.length} farm orders.`
            : `Order ${numbers[0]} is confirmed and sent to the farmer.`,
        link: `/orders/${first}`,
        read: false,
        createdAt: now,
      });
    }

    // notify farmers that have real accounts
    for (const g of quote.groups) {
      const farmer = await ctx.db.get(g.farmerId);
      if (farmer?.userId) {
        await ctx.db.insert("notifications", {
          userId: farmer.userId,
          kind: "order_placed",
          title: `New order from ${user.name ?? "a buyer"}`,
          body: `${g.lines.length} item(s) worth ₹${g.total} — ${g.lines
            .map((l) => `${l.qty} ${l.unit} ${l.name}`)
            .slice(0, 2)
            .join(", ")}${g.lines.length > 2 ? "…" : ""}`,
          link: farmerOrderId.has(g.farmerId) ? `/farmer/orders` : undefined,
          read: false,
          createdAt: now,
        });
      }
    }

    // save the delivery contact to the buyer profile for next time
    if (!user.phone || user.phone !== args.phone.trim()) {
      await ctx.db.patch(user._id, {
        phone: args.phone.trim(),
        addressLine: addr.line.trim(),
        city: addr.city.trim(),
        state: addr.state.trim(),
        pincode: addr.pincode.trim(),
      });
    }

    return {
      orderIds,
      numbers,
      total: quote.total,
      coupon: quote.coupon,
    };
  },
});

// ─────────────────────────── status flow ───────────────────────────

export const myOrders = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    if (user.role === "admin") return [];
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_buyer", (q) => q.eq("buyerId", user._id))
      .collect();
    return orders.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const orderDetail = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    const farmer = await ctx.db.get(order.farmerId);
    const isBuyer = order.buyerId === user._id;
    const myFarmer = await myFarmerOrNull(ctx);
    const isFarmerOwner = myFarmer !== null && myFarmer._id === order.farmerId;
    const isAdmin = user.role === "admin";
    if (!isBuyer && !isFarmerOwner && !isAdmin) {
      throw new ConvexError("This order is not yours.");
    }
    return {
      order,
      farmer: farmer
        ? {
            id: farmer._id,
            name: farmer.name,
            farmName: farmer.farmName,
            village: farmer.village,
            district: farmer.district,
            state: farmer.state,
            verified: farmer.verified,
          }
        : null,
      perspective: isFarmerOwner ? "farmer" : isAdmin ? "admin" : "buyer",
    };
  },
});

export const farmerOrders = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const farmer = await requireMyFarmer(ctx);
    let orders = await ctx.db
      .query("orders")
      .withIndex("by_farmer", (q) => q.eq("farmerId", farmer._id))
      .collect();
    if (args.status) {
      orders = orders.filter((o) => o.status === args.status);
    }
    return orders.sort((a, b) => b.createdAt - a.createdAt);
  },
});

type ActorKind = "farmer" | "buyer" | "admin";

function allowedNext(status: string, actor: ActorKind): string[] {
  if (actor === "admin") {
    if (status === "placed" || status === "confirmed") return ["cancelled"];
    return [];
  }
  if (actor === "buyer") {
    return status === "placed" ? ["cancelled"] : [];
  }
  // farmer
  switch (status) {
    case "placed":
      return ["confirmed", "cancelled"];
    case "confirmed":
      return ["out_for_delivery", "cancelled"];
    case "out_for_delivery":
      return ["delivered"];
    default:
      return [];
  }
}

export const setOrderStatus = mutation({
  args: { orderId: v.id("orders"), to: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found.");
    const myFarmer = await myFarmerOrNull(ctx);
    const actor: ActorKind =
      user.role === "admin"
        ? "admin"
        : myFarmer !== null && myFarmer._id === order.farmerId
          ? "farmer"
          : order.buyerId === user._id
            ? "buyer"
            : (() => {
                throw new ConvexError("This order is not yours to update.");
              })();

    if (!allowedNext(order.status, actor).includes(args.to)) {
      throw new ConvexError(
        `Cannot move an order from "${order.status}" to "${args.to}".`,
      );
    }
    const now = Date.now();
    const patch: Record<string, unknown> = {
      status: args.to,
      timeline: [
        ...order.timeline,
        { status: args.to, label: statusLabel(args.to), at: now },
      ],
    };
    if (args.to === "delivered") {
      patch.deliveredAt = now;
      if (order.paymentStatus === "pending") patch.paymentStatus = "paid";
    }
    if (args.to === "cancelled") {
      // demo refund bookkeeping + restore inventory
      patch.paymentStatus =
        order.paymentStatus === "paid" ? "refunded" : "pending";
      for (const item of order.items) {
        const product = await ctx.db.get(item.productId);
        if (product) {
          await ctx.db.patch(product._id, {
            stockQty: product.stockQty + item.qty,
            soldQty: Math.max(0, product.soldQty - item.qty),
          });
        }
      }
    }
    await ctx.db.patch(order._id, patch);

    // notify the other side
    if (order.buyerId && actor !== "buyer") {
      await ctx.db.insert("notifications", {
        userId: order.buyerId,
        kind: "order_status",
        title: `Order ${order.number} ${args.to.replace(/_/g, " ")}`,
        body: statusLabel(args.to),
        link: `/orders/${order._id}`,
        read: false,
        createdAt: now,
      });
    }
    const farmer = await ctx.db.get(order.farmerId);
    if (farmer?.userId && actor !== "farmer") {
      await ctx.db.insert("notifications", {
        userId: farmer.userId,
        kind: "order_status",
        title: `Order ${order.number} ${args.to.replace(/_/g, " ")}`,
        body: statusLabel(args.to),
        link: `/farmer/orders`,
        read: false,
        createdAt: now,
      });
    }
    return { ok: true, status: args.to };
  },
});

export type OrderDoc = Doc<"orders">;
