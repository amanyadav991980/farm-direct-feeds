import { SiteHeader } from "@/components/site-header";
import { CropArt } from "@/components/crop-art";
import { AvailabilityPill } from "@/components/status";
import { WorkspaceNav } from "@/components/workspace-nav";
import { Container, EmptyState, Loading } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { errMsg, fmtQty, inr, shortDate } from "@/lib/format";
import { availabilityOf } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Eye,
  EyeOff,
  Leaf,
  Loader2,
  Minus,
  PackagePlus,
  Pencil,
  Plus,
  Sprout,
  Store,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel";

type Product = Doc<"products">;

const FARMER_TABS = [
  { to: "/farmer", label: "Overview", end: true },
  { to: "/farmer/products", label: "Listings" },
  { to: "/farmer/orders", label: "Orders" },
  { to: "/farmer/inquiries", label: "Inquiries" },
  { to: "/farmer/insights", label: "Insights" },
];

export default function FarmerProducts() {
  const { user } = useAuth();
  const products = useQuery(api.products.myProducts);
  const settings = useQuery(api.settings.getSettings);
  const adjustStock = useMutation(api.products.adjustStock);
  const toggleActive = useMutation(api.products.updateProduct);
  const [busy, setBusy] = useState<string | null>(null);

  if (!user?.role) return null;
  const discountPct = settings?.marketDiscountPercent ?? 10;

  const act = async (
    key: string,
    fn: () => Promise<unknown>,
    ok: string,
  ) => {
    setBusy(key);
    try {
      await fn();
      toast.success(ok);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const stockDelta = async (p: Product, delta: number) => {
    await act(
      `stock-${p._id}`,
      () => adjustStock({ productId: p._id as never, delta }),
      delta > 0
        ? `${p.name} restocked (+${fmtQty(delta)} ${p.unit})`
        : `${p.name} stock reduced`,
    );
  };

  const toggle = async (p: Product) => {
    await act(
      `active-${p._id}`,
      () =>
        toggleActive({ productId: p._id as never, isActive: !p.isActive }),
      p.isActive ? `${p.name} hidden from the market` : `${p.name} is live again`,
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Container className="py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Farmer dashboard
            </p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">Listings & inventory</h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              Every live listing is a crop lot buyers can add straight to their
              basket. Deactivating or selling out hides it automatically.
            </p>
          </div>
          <Button className="gap-2" asChild>
            <Link to="/farmer/product/new">
              <PackagePlus className="size-4.5" /> List a new crop
            </Link>
          </Button>
        </div>
        <WorkspaceNav tabs={FARMER_TABS} className="mt-6" />

        <div className="mt-7">
          {products === undefined ? (
            <Loading label="Loading your listings…" />
          ) : products.length === 0 ? (
            <EmptyState
              icon={Store}
              title="No listings yet"
              body="Pick a crop from the catalogue, set your lot size and price against the day's market rate — your listing is live for every buyer instantly."
              action={
                <Button asChild>
                  <Link to="/farmer/product/new">List your first crop</Link>
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
                <span>
                  <span className="font-mono font-bold text-foreground">{products.length}</span>{" "}
                  listings
                </span>
                <span>
                  <span className="font-mono font-bold text-emerald-700">
                    {products.filter((p) => p.isActive).length}
                  </span>{" "}
                  live
                </span>
                <span>
                  <span className="font-mono font-bold text-amber-700">
                    {products.filter((p) => p.isActive && p.stockQty <= 0).length}
                  </span>{" "}
                  sold out
                </span>
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1">
                  <Leaf className="size-3.5 text-primary" /> Platform discount{" "}
                  {discountPct}% below market rate
                </span>
              </div>

              <ul className="grid gap-4 lg:grid-cols-2">
                {products.map((p) => {
                  const av = availabilityOf(p);
                  const unitPrice = Math.round(
                    p.marketPrice * (1 - discountPct / 100),
                  );
                  const ratio =
                    p.initialStock > 0 ? p.stockQty / p.initialStock : 1;
                  return (
                    <li
                      key={p._id}
                      className={cn(
                        "overflow-hidden rounded-2xl border bg-card transition-opacity",
                        p.isActive ? "border-border" : "border-border/70 opacity-75",
                      )}
                    >
                      <div className="flex gap-4 p-4">
                        <Link to={`/farmer/product/${p._id}`} className="shrink-0">
                          <CropArt
                            emoji={p.emoji}
                            tint={p.tint}
                            name={p.name}
                            imageUrl={p.imageUrl}
                            className="size-20 rounded-xl"
                            glyphClassName="text-3xl"
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <Link
                              to={`/farmer/product/${p._id}`}
                              className="truncate text-[15px] font-bold hover:text-primary"
                            >
                              {p.name}
                            </Link>
                            <span className="rounded-md bg-muted px-1.5 py-px font-mono text-[10px] uppercase text-muted-foreground">
                              {p.grade}
                            </span>
                            {p.organic && (
                              <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase text-emerald-700">
                                <Leaf className="size-3" /> organic
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span className="font-mono text-[15px] font-bold text-foreground">
                              {inr(unitPrice)}
                              <span className="text-[10px] font-normal text-muted-foreground">
                                {" "}/ {p.unit}
                              </span>
                            </span>
                            {discountPct > 0 && (
                              <span className="line-through">{inr(p.marketPrice)}</span>
                            )}
                            <span>min {fmtQty(p.minOrderQty)} {p.unit}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <AvailabilityPill availability={av} />
                            <span className="text-xs text-muted-foreground">
                              harvested {shortDate(p.harvestDate)} · sold{" "}
                              {fmtQty(p.soldQty)} {p.unit}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* stock bar + controls */}
                      <div className="border-t border-dashed border-border bg-muted/30 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Stock
                          </span>
                          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-border/70">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                ratio < 0.2 ? "bg-amber-500" : "bg-primary",
                              )}
                              style={{ width: `${Math.max(0, Math.min(100, ratio * 100))}%` }}
                            />
                          </div>
                          <span className="font-mono text-sm font-bold">
                            {fmtQty(p.stockQty)} <span className="text-[10px] font-normal text-muted-foreground">{p.unit}</span>
                          </span>
                          <span className="ml-auto flex items-center gap-1">
                            <button
                              type="button"
                              className="flex size-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-40"
                              disabled={busy === `stock-${p._id}` || p.stockQty <= 0}
                              onClick={() => void stockDelta(p, -Math.min(10, p.stockQty))}
                              aria-label="Reduce stock by ten"
                            >
                              {busy === `stock-${p._id}` ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Minus className="size-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="flex size-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-40"
                              disabled={busy === `stock-${p._id}`}
                              onClick={() => void stockDelta(p, 10)}
                              aria-label="Restock by ten"
                            >
                              {busy === `stock-${p._id}` ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Plus className="size-3.5" />
                              )}
                            </button>
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-1.5 border-t border-border bg-card/60 p-2.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-[12.5px]"
                          disabled={busy === `active-${p._id}`}
                          onClick={() => void toggle(p)}
                        >
                          {busy === `active-${p._id}` ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : p.isActive ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                          {p.isActive ? "Hide listing" : "Put back live"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-auto gap-1.5 text-[12.5px]"
                          asChild
                        >
                          <Link to={`/farmer/product/${p._id}`}>
                            <Pencil className="size-3.5" /> Edit details
                          </Link>
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <Sprout className="size-4 text-primary/70" />
          Selling prices shown are the market rate less the platform&apos;s{" "}
          {discountPct}% farm-gate discount — buyers see the same number.
        </div>
      </Container>
    </div>
  );
}
