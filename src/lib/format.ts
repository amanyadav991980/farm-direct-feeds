// Shared client-side formatting + marketplace logic.
// Mirrors the server's pricing/availability rules so cards never drift.

export const inr = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN");

export function fmtQty(qty: number): string {
  return Number(qty).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function shortDateTime(ts: number): string {
  return (
    new Date(ts).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    }) +
    ", " +
    new Date(ts).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

/** Selling price maths — must match convex/marketplace priceBreakdown. */
export function priceBreakdown(marketPrice: number, discountPct: number) {
  const unitPrice = Math.round(marketPrice * (1 - discountPct / 100));
  return { unitPrice, discountAmount: marketPrice - unitPrice, discountPct };
}

export type Availability = "available" | "limited" | "upcoming" | "out" | "inactive";

/** Availability rules mirror convex availabilityOf. */
export function availabilityOf(input: {
  isActive?: boolean;
  stockQty: number;
  initialStock: number;
  harvestDate: number;
}): Availability {
  if (input.isActive === false) return "inactive";
  if (input.stockQty > 0) {
    const ratio = input.initialStock > 0 ? input.stockQty / input.initialStock : 1;
    return ratio < 0.2 ? "limited" : "available";
  }
  if (input.harvestDate > Date.now()) return "upcoming";
  return "out";
}

export const AVAILABILITY_META: Record<
  Availability,
  { label: string; tone: "ok" | "warn" | "bad" | "info" | "muted" }
> = {
  available: { label: "AVAILABLE", tone: "ok" },
  limited: { label: "LIMITED STOCK", tone: "warn" },
  upcoming: { label: "UPCOMING HARVEST", tone: "info" },
  out: { label: "OUT OF STOCK", tone: "bad" },
  inactive: { label: "HIDDEN", tone: "muted" },
};

export const ORDER_STATUS_META: Record<
  string,
  { label: string; tone: "ok" | "warn" | "bad" | "info" | "muted" }
> = {
  placed: { label: "Placed", tone: "info" },
  confirmed: { label: "Confirmed", tone: "ok" },
  out_for_delivery: { label: "Out for delivery", tone: "warn" },
  delivered: { label: "Delivered", tone: "ok" },
  cancelled: { label: "Cancelled", tone: "bad" },
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_META[status]?.label ?? status.replace(/_/g, " ");
}

export const TONES: Record<
  "ok" | "warn" | "bad" | "info" | "muted",
  string
> = {
  ok: "text-emerald-800 bg-emerald-100/80 border-emerald-300/60",
  warn: "text-amber-800 bg-amber-100/80 border-amber-300/60",
  bad: "text-red-800 bg-red-100/80 border-red-300/60",
  info: "text-sky-900 bg-sky-100/80 border-sky-300/60",
  muted: "text-stone-500 bg-stone-200/60 border-stone-300/60",
};

export function errMsg(err: unknown): string {
  if (err && typeof err === "object") {
    const e = err as { data?: { message?: string }; message?: string };
    return e?.data?.message || e?.message || "Something went wrong.";
  }
  return String(err ?? "Something went wrong.");
}

/** Crop-art tint palette (must match product tint indices 0–15). */
export const TINTS: { bg: string; border: string }[] = [
  { bg: "#eef4e4", border: "#cddab8" }, // 0 leaf
  { bg: "#f4efe0", border: "#dfd3ae" }, // 1 sand
  { bg: "#e5f0e3", border: "#c3d9bd" }, // 2 mint
  { bg: "#f6ecdc", border: "#e2cfae" }, // 3 wheat
  { bg: "#e9f2ee", border: "#c4dcd2" }, // 4 seafoam
  { bg: "#f8efe3", border: "#e5d2b4" }, // 5 cream
  { bg: "#fdeee2", border: "#efcfa9" }, // 6 apricot
  { bg: "#f5e8ec", border: "#e0c6d0" }, // 7 berry
  { bg: "#fbe9e2", border: "#efc6b4" }, // 8 tomato
  { bg: "#fbf0da", border: "#ecd9a6" }, // 9 lemon
  { bg: "#e7efe0", border: "#c6d7b2" }, // 10 lime
  { bg: "#f6e4de", border: "#e3c2b4" }, // 11 clay
  { bg: "#f2ecdd", border: "#ded2b4" }, // 12 oat
  { bg: "#f4f0da", border: "#e2dba6" }, // 13 gold
  { bg: "#efeee2", border: "#d4d3b8" }, // 14 stone
  { bg: "#e9ecf2", border: "#c8d0dc" }, // 15 slate
];

export const CATEGORY_CHIP: Record<string, string> = {
  Vegetables: "VEG",
  Fruits: "FRT",
  Grains: "GRN",
  Pulses: "PLS",
  Oilseeds: "OIL",
  Other: "OTH",
};

export function pluralUnit(unit: string, qty: number): string {
  if (unit === "dozen") return qty === 1 ? "dozen" : "dozens";
  return unit;
}
