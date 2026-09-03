// Live analytics computed from database records.
import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireRole } from "./profiles";
import { requireMyFarmer } from "./seller";
import type { Doc } from "./_generated/dataModel";

type OrderDoc = Doc<"orders">;

function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function fillSeries(
  orders: OrderDoc[],
  days: number,
  include: (o: OrderDoc) => boolean,
) {
  const out: { day: string; label: string; count: number; value: number }[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    const t = now - i * 24 * 60 * 60 * 1000;
    const d = new Date(t);
    out.push({
      day: dayKey(t),
      label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      count: 0,
      value: 0,
    });
  }
  const map = new Map(out.map((p) => [p.day, p]));
  for (const o of orders) {
    if (!include(o)) continue;
    const bucket = map.get(dayKey(o.createdAt));
    if (bucket) {
      bucket.count += 1;
      bucket.value += o.total;
    }
  }
  return out;
}

/** Public home-page stats. */
export const publicStats = query({
  args: {},
  handler: async (ctx) => {
    const [farmers, products, orders, users] = await Promise.all([
      ctx.db.query("farmers").collect(),
      ctx.db.query("products").collect(),
      ctx.db.query("orders").collect(),
      ctx.db.query("users").collect(),
    ]);
    const active = products.filter((p) => p.isActive);
    const completed = orders.filter((o) => o.status === "delivered");
    const buyers = new Set<string>();
    for (const o of orders) if (o.buyerName) buyers.add(o.buyerName);
    for (const u of users) if (u.role === "buyer") buyers.add(`user:${u._id}`);
    const verifiedFarmers = farmers.filter((f) => f.verified).length;
    return {
      farmers: farmers.length,
      verifiedFarmers,
      products: active.length,
      deliveredOrders: completed.length,
      gmv: Math.round(completed.reduce((s, o) => s + o.total, 0)),
      buyers: buyers.size,
      avgOrderValue: completed.length
        ? Math.round(
            completed.reduce((s, o) => s + o.total, 0) / completed.length,
          )
        : 0,
    };
  },
});

/** Farmer dashboard KPIs + trends (all derived from real order records). */
export const farmerDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const farmer = await requireMyFarmer(ctx);
    const [orders, products] = await Promise.all([
      ctx.db.query("orders").collect(),
      ctx.db
        .query("products")
        .withIndex("by_farmer", (q) => q.eq("farmerId", farmer._id))
        .collect(),
    ]);
    const mine = orders.filter((o) => o.farmerId === farmer._id);
    const delivered = mine.filter((o) => o.status === "delivered");
    const activeProducts = products.filter((p) => p.isActive);
    const limitedStock = activeProducts.filter((p) => {
      if (p.stockQty <= 0) return false;
      const ratio = p.initialStock > 0 ? p.stockQty / p.initialStock : 1;
      return ratio < 0.2;
    });
    const outOfStock = activeProducts.filter((p) => p.stockQty <= 0);
    const pending = mine.filter(
      (o) => o.status === "placed" || o.status === "confirmed",
    );
    const underway = mine.filter((o) => o.status === "out_for_delivery");
    const farmerShare = (o: OrderDoc) =>
      o.discountedSubtotal - (o.couponDiscount ?? 0);
    const earnings = Math.round(delivered.reduce((s, o) => s + farmerShare(o), 0));
    const pendingValue = Math.round(
      pending.reduce((s, o) => s + farmerShare(o), 0),
    );
    const productPerf = new Map<
      string,
      { name: string; emoji: string; qty: number; value: number }
    >();
    for (const o of [...delivered, ...pending, ...underway]) {
      for (const it of o.items) {
        const row = productPerf.get(it.name) ?? {
          name: it.name,
          emoji: it.emoji,
          qty: 0,
          value: 0,
        };
        row.qty += it.qty;
        row.value += it.total;
        productPerf.set(it.name, row);
      }
    }
    return {
      kpis: {
        totalProducts: activeProducts.length,
        stockUnits: activeProducts.reduce((s, p) => s + p.stockQty, 0),
        limitedStock: limitedStock.length,
        outOfStock: outOfStock.length,
        pendingOrders: pending.length,
        underwayOrders: underway.length,
        deliveredCount: delivered.length,
        totalSales: Math.round(
          [...delivered, ...pending, ...underway].reduce(
            (s, o) => s + o.discountedSubtotal,
            0,
          ),
        ),
        pendingValue,
        earnings,
        totalOrders: mine.length,
      },
      salesSeries: fillSeries(mine, 30, (o) => o.status !== "cancelled").map(
        (p) => ({
          day: p.label,
          orders: p.count,
          value: Math.round(p.value),
        }),
      ),
      productPerformance: [...productPerf.entries()]
        .map(([name, p]) => ({ ...p, name }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    };
  },
});

/** Admin command centre stats. */
export const adminStats = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, "admin");
    const [orders, farmers, products, users, coupons] = await Promise.all([
      ctx.db.query("orders").collect(),
      ctx.db.query("farmers").collect(),
      ctx.db.query("products").collect(),
      ctx.db.query("users").collect(),
      ctx.db.query("coupons").collect(),
    ]);
    const delivered = orders.filter((o) => o.status === "delivered");
    const activeProducts = products.filter((p) => p.isActive);
    const revenue = Math.round(delivered.reduce((s, o) => s + o.total, 0));
    const fees = Math.round(
      delivered.reduce((s, o) => s + o.platformFee, 0),
    );
    const discountGiven = Math.round(
      delivered.reduce(
        (s, o) => s + (o.couponDiscount ?? 0) + (o.discountAmount ?? 0),
        0,
      ),
    );
    const topProducts = new Map<
      string,
      { name: string; emoji: string; qty: number; value: number }
    >();
    for (const o of delivered) {
      for (const it of o.items) {
        const row = topProducts.get(it.name) ?? {
          name: it.name,
          emoji: it.emoji,
          qty: 0,
          value: 0,
        };
        row.qty += it.qty;
        row.value += it.total;
        topProducts.set(it.name, row);
      }
    }
    return {
      kpis: {
        farmers: farmers.length,
        verifiedFarmers: farmers.filter((f) => f.verified).length,
        activeProductsCount: activeProducts.length,
        outOfStock: activeProducts.filter((p) => p.stockQty <= 0).length,
        totalOrders: orders.length,
        deliveredOrders: delivered.length,
        cancelled: orders.filter((o) => o.status === "cancelled").length,
        revenue,
        fees,
        discountGiven,
        buyers: users.filter((u) => u.role === "buyer").length,
        farmerUsers: users.filter((u) => u.role === "farmer").length,
        coupons: coupons.length,
      },
      ordersSeries: fillSeries(orders, 30, (o) => o.status !== "cancelled").map(
        (p) => ({
          day: p.label,
          orders: p.count,
          value: Math.round(p.value),
        }),
      ),
      topProducts: [...topProducts.entries()]
        .map(([name, p]) => ({ ...p, name }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
      recentOrders: orders
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 12)
        .map((o) => ({
          id: o._id,
          number: o.number,
          buyerName: o.buyerName,
          total: o.total,
          status: o.status,
          createdAt: o.createdAt,
          itemCount: o.items.reduce((s, i) => s + i.qty, 0),
        })),
    };
  },
});

export const farmerRanking = query({
  args: {},
  handler: async (ctx) => {
    const [farmers, orders] = await Promise.all([
      ctx.db.query("farmers").collect(),
      ctx.db.query("orders").collect(),
    ]);
    const delivered = orders.filter((o) => o.status === "delivered");
    const byFarmer = new Map<string, { gmv: number; orders: number }>();
    for (const o of delivered) {
      const row = byFarmer.get(o.farmerId) ?? { gmv: 0, orders: 0 };
      row.gmv += o.total;
      row.orders += 1;
      byFarmer.set(o.farmerId, row);
    }
    return farmers
      .map((f) => ({
        id: f._id,
        name: f.name,
        farmName: f.farmName,
        village: f.village,
        district: f.district,
        state: f.state,
        verified: f.verified,
        ratingAvg: f.ratingAvg,
        gmv: byFarmer.get(f._id)?.gmv ?? 0,
        orderCount: byFarmer.get(f._id)?.orders ?? 0,
      }))
      .sort((a, b) => b.gmv - a.gmv)
      .slice(0, 50);
  },
});
