// AI-ready insight layer — v1 ships a transparent local heuristic engine so
// the UI is fully functional, with an explicit seam to swap in a real model
// (demand forecasting / price recommendation / route optimisation) later.
// Nothing here claims to be a trained ML model; outputs are labelled
// "heuristic estimate".
import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireMyFarmer } from "./seller";
import { getSessionUser } from "./profiles";
import { priceBreakdown } from "./marketplace";
import { getPlatformSettings } from "./settings";

const DAY = 24 * 60 * 60 * 1000;

export const demandForecast = query({
  args: {},
  handler: async (ctx) => {
    const orders = (await ctx.db.query("orders").collect()).filter(
      (o) => o.status === "delivered",
    );
    const now = Date.now();
    const agg = new Map<
      string,
      {
        name: string;
        emoji: string;
        unit: string;
        recentQty: number; // last 30 days
        priorQty: number; // previous 60 days
        recentOrders: number;
      }
    >();
    for (const o of orders) {
      const age = now - o.createdAt;
      if (age > 90 * DAY) continue;
      for (const it of o.items) {
        const row = agg.get(it.name) ?? {
          name: it.name,
          emoji: it.emoji,
          unit: it.unit,
          recentQty: 0,
          priorQty: 0,
          recentOrders: 0,
        };
        if (age <= 30 * DAY) {
          row.recentQty += it.qty;
          row.recentOrders += 1;
        } else {
          row.priorQty += it.qty;
        }
        agg.set(it.name, row);
      }
    }
    const out = [...agg.values()]
      .map((r) => {
        const daily = r.recentQty / 30;
        const priorDaily = r.priorQty / 60;
        const momentum = priorDaily > 0 ? daily / priorDaily : 1;
        const direction = momentum > 1.15 ? "up" : momentum < 0.85 ? "down" : "flat";
        return {
          name: r.name,
          emoji: r.emoji,
          unit: r.unit,
          recentQty: Math.round(r.recentQty),
          priorQty: Math.round(r.priorQty),
          forecast7: Math.round(daily * 7 * Math.max(0.6, Math.min(1.6, momentum))),
          direction,
          trendPct: Math.round((momentum - 1) * 100),
        };
      })
      .sort((a, b) => b.forecast7 - a.forecast7)
      .slice(0, 12);
    return {
      model: "local-heuristic-v1",
      note: "Heuristic estimate from rolling 90-day order history — the seam for a real forecasting model.",
      rows: out,
    };
  },
});

export const priceRecommendations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getSessionUser(ctx);
    if (!user || user.role !== "farmer") return { rows: [] };
    const farmer = await requireMyFarmer(ctx);
    const settings = await getPlatformSettings(ctx);
    const [mine, all] = await Promise.all([
      ctx.db
        .query("products")
        .withIndex("by_farmer", (q) => q.eq("farmerId", farmer._id))
        .collect(),
      ctx.db.query("products").collect(),
    ]);
    const active = mine.filter((p) => p.isActive);
    // platform average selling price per crop name
    const byName = new Map<string, { sum: number; count: number }>();
    for (const p of all) {
      if (!p.isActive) continue;
      const { unitPrice } = priceBreakdown(p.marketPrice, settings.marketDiscountPercent);
      const row = byName.get(p.name) ?? { sum: 0, count: 0 };
      row.sum += unitPrice;
      row.count += 1;
      byName.set(p.name, row);
    }
    const rows = active.slice(0, 12).map((p) => {
      const avg = byName.get(p.name);
      const avgPrice = avg ? avg.sum / avg.count : null;
      const { unitPrice } = priceBreakdown(p.marketPrice, settings.marketDiscountPercent);
      let action: "raise" | "hold" | "cut" = "hold";
      let reason = "Price is in line with the platform average.";
      if (avgPrice !== null) {
        const diff = (unitPrice - avgPrice) / avgPrice;
        if (diff > 0.08) {
          action = "cut";
          reason = `Selling ${Math.round(Math.abs(diff) * 100)}% above the platform average (₹${avgPrice}/${p.unit}) — trimming price could lift order volume.`;
        } else if (diff < -0.08) {
          action = "raise";
          reason = `Selling ${Math.round(Math.abs(diff) * 100)}% below the platform average (₹${avgPrice}/${p.unit}).`;
        } else {
          reason = `In line with the platform average of ₹${avgPrice}/${p.unit}.`;
        }
      }
      const suggested =
        action === "raise" && avgPrice !== null
          ? Math.round(avgPrice)
          : action === "cut" && avgPrice !== null
            ? Math.round(avgPrice)
            : unitPrice;
      return {
        productId: p._id,
        name: p.name,
        emoji: p.emoji,
        unit: p.unit,
        marketPrice: p.marketPrice,
        unitPrice,
        avgPrice: avgPrice ? Math.round(avgPrice) : null,
        action,
        suggested,
        reason,
      };
    });
    return {
      model: "local-heuristic-v1",
      note: "Compared against the live platform average selling price. A trained price-model can replace this comparison.",
      rows,
    };
  },
});

export const lowStockAlerts = query({
  args: {},
  handler: async (ctx) => {
    const user = await getSessionUser(ctx);
    if (!user || user.role !== "farmer") return [];
    const farmer = await requireMyFarmer(ctx);
    const products = await ctx.db
      .query("products")
      .withIndex("by_farmer", (q) => q.eq("farmerId", farmer._id))
      .collect();
    return products
      .filter((p) => p.isActive)
      .map((p) => ({
        productId: p._id,
        name: p.name,
        emoji: p.emoji,
        unit: p.unit,
        stockQty: p.stockQty,
        minOrderQty: p.minOrderQty,
        status:
          p.stockQty <= 0
            ? ("out" as const)
            : p.initialStock > 0 && p.stockQty / p.initialStock < 0.2
              ? ("limited" as const)
              : ("ok" as const),
      }))
      .filter((p) => p.status !== "ok")
      .sort((a, b) => a.stockQty - b.stockQty);
  },
});
