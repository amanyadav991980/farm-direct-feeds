// Platform settings + market price service state.
import { v } from "convex/values";
import { action, mutation, query, QueryCtx } from "./_generated/server";
import { requireRole } from "./profiles";
import { api } from "./_generated/api";

export const SETTINGS_KEY = "platform";

export const DEFAULT_SETTINGS = {
  marketDiscountPercent: 10, // MARKET_DISCOUNT_PERCENT
  platformFeePercent: 1, // PLATFORM_FEE_PERCENT
  deliveryFee: 150, // flat demo delivery fee per order
  marketMode: "demo" as "demo" | "live",
  marketSourceLabel: "Demo mandi price index (not live)",
};

export type PlatformSettings = {
  key: string;
  marketDiscountPercent: number;
  platformFeePercent: number;
  deliveryFee: number;
  marketMode: "demo" | "live";
  marketSourceLabel: string;
  marketSourceUrl?: string;
  marketLastSync?: number;
};

type DbLike = { db: QueryCtx["db"] };

/** Reads the singleton platform settings doc (falling back to defaults). */
export async function getPlatformSettings(
  ctx: DbLike,
): Promise<PlatformSettings> {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
    .first();
  if (!row) return { key: SETTINGS_KEY, ...DEFAULT_SETTINGS };
  const { _id: _i1, _creationTime: _i2, ...stored } = row;
  void _i1;
  void _i2;
  return { ...DEFAULT_SETTINGS, ...stored };
}

export const getSettings = query({
  args: {},
  handler: async (ctx) => getPlatformSettings(ctx),
});

export const updateSettings = mutation({
  args: {
    marketDiscountPercent: v.number(),
    platformFeePercent: v.number(),
    deliveryFee: v.number(),
    marketMode: v.union(v.literal("demo"), v.literal("live")),
    marketSourceLabel: v.string(),
    marketSourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const doc = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", SETTINGS_KEY))
      .first();
    const patch = {
      marketDiscountPercent: Math.min(50, Math.max(0, args.marketDiscountPercent)),
      platformFeePercent: Math.min(10, Math.max(0, args.platformFeePercent)),
      deliveryFee: Math.max(0, args.deliveryFee),
      marketMode: args.marketMode,
      marketSourceLabel: args.marketSourceLabel.slice(0, 120),
      marketSourceUrl: args.marketSourceUrl?.trim() || undefined,
    };
    if (doc) {
      await ctx.db.patch(doc._id, patch);
    } else {
      await ctx.db.insert("settings", { key: SETTINGS_KEY, ...patch });
    }
    return { ok: true };
  },
});

/**
 * Market price service — the architectural seam between Farmdirect and live
 * mandi price sources (Agmarknet-type APIs).
 *
 * v1 runs in DEMO mode: prices on product rows are labelled demo and the
 * discount logic is the only "service" applied. When an admin configures a
 * live source URL and flips marketMode to "live", this action polls it.
 * Any failure fails the sync visibly and the UI keeps the DEMO MARKET PRICE
 * label so we never claim live numbers we don't have.
 */
export const syncMarketPrices = action({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.runQuery(api.settings.getSettings);
    if (settings.marketMode !== "live" || !settings.marketSourceUrl) {
      return {
        ok: true,
        mode: "demo" as const,
        refreshed: Date.now(),
        note: "Demo mode — no live source configured. Configure a live market API URL in Admin → Settings to enable live sync.",
      };
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(settings.marketSourceUrl, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`Source returned HTTP ${res.status}`);
      const payload = (await res.json()) as unknown;
      return {
        ok: true,
        mode: "live" as const,
        refreshed: Date.now(),
        sampleKeys: Array.isArray(payload)
          ? payload.slice(0, 5)
          : typeof payload === "object" && payload !== null
            ? Object.keys(payload).slice(0, 10)
            : [],
        note: "Live sync endpoint responding. Map your payload to crop slugs to start refreshing product market prices.",
      };
    } catch (err) {
      return {
        ok: false,
        mode: "live" as const,
        refreshed: Date.now(),
        error:
          err instanceof Error
            ? err.message
            : "Unknown error reaching market price source.",
      };
    }
  },
});
