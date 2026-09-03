import { SiteHeader } from "@/components/site-header";
import { CropArt } from "@/components/crop-art";
import { AvailabilityPill } from "@/components/status";
import { Container, EmptyState, Loading } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { errMsg, fmtQty, inr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  BadgeCheck,
  Leaf,
  Loader2,
  Lock,
  Minus,
  Plus,
  ShoppingBasket,
  Trash2,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import type { ListingRow } from "@/components/product-card";

type CartLine = {
  cartItemId: string;
  productId: string;
  quantity: number;
  listing: ListingRow;
};

export default function CartPage() {
  const { user } = useAuth();
  const lines = useQuery(api.cart.myCart);
  const setQty = useMutation(api.cart.setCartQuantity);
  const remove = useMutation(api.cart.removeFromCart);
  const [busy, setBusy] = useState<string | null>(null);

  if (!user?.role) return null;

  const all: CartLine[] = (lines ?? []) as unknown as CartLine[];
  const groups = new Map<
    string,
    {
      farmName: string;
      verified: boolean;
      village: string;
      rows: CartLine[];
    }
  >();
  for (const line of all) {
    const g = groups.get(line.listing.farmerId) ?? {
      farmName: line.listing.farmer.farmName,
      verified: line.listing.farmer.verified,
      village: `${line.listing.farmer.village}, ${line.listing.farmer.district}`,
      rows: [],
    };
    g.rows.push(line);
    groups.set(line.listing.farmerId, g);
  }
  const list = [...groups.entries()];
  const itemCount = all.reduce((s, l) => s + l.quantity, 0);
  const subtotal = all.reduce((s, l) => s + l.quantity * l.listing.unitPrice, 0);

  const changeQty = async (cartItemId: string, qty: number) => {
    setBusy(cartItemId);
    try {
      await setQty({ cartItemId: cartItemId as never, quantity: qty });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const removeLine = async (cartItemId: string, name: string) => {
    setBusy(cartItemId);
    try {
      await remove({ cartItemId: cartItemId as never });
      toast.success(`${name} removed from your basket`);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Container className="py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Buyer dashboard
            </p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">Your basket</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {itemCount > 0
                ? `${fmtQty(itemCount)} units from ${list.length} farm${list.length === 1 ? "" : "s"} — checkout places one order per farm.`
                : "Add fresh produce from the market and it will be waiting here."}
            </p>
          </div>
        </div>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            {lines === undefined ? (
              <Loading label="Loading your basket…" />
            ) : all.length === 0 ? (
              <EmptyState
                icon={ShoppingBasket}
                title="Your basket is empty"
                body="Browse the fresh market and add harvests from verified farms — lots start at small minimums so households and bulk buyers both fit."
                action={
                  <Button asChild>
                    <Link to="/fresh">Browse fresh produce</Link>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-5">
                {list.map(([farmerId, g]) => {
                  const farmSubtotal = g.rows.reduce(
                    (s, r) => s + r.quantity * r.listing.unitPrice,
                    0,
                  );
                  return (
                    <section key={farmerId} className="overflow-hidden rounded-2xl border border-border bg-card">
                      <header className="flex flex-wrap items-center gap-2 border-b border-border bg-card/70 px-4 py-3">
                        <Link
                          to={`/farmer/${farmerId}`}
                          className="inline-flex items-center gap-1.5 text-[15px] font-bold hover:text-primary"
                        >
                          {g.farmName}
                          {g.verified && <BadgeCheck className="size-4 text-primary" />}
                        </Link>
                        <span className="text-xs text-muted-foreground">{g.village}</span>
                        <span className="ml-auto font-mono text-sm font-bold">
                          {inr(farmSubtotal)}
                        </span>
                      </header>
                      <ul className="divide-y divide-dashed divide-border">
                        {g.rows.map((line) => (
                          <li key={line.cartItemId} className="flex items-center gap-4 px-4 py-3.5">
                            <CropArt
                              emoji={line.listing.emoji}
                              tint={line.listing.tint}
                              name={line.listing.name}
                              imageUrl={line.listing.imageUrl}
                              className="size-16 shrink-0 rounded-xl"
                              glyphClassName="text-2xl"
                            />
                            <div className="min-w-0 flex-1">
                              <Link
                                to={`/product/${line.productId}`}
                                className="block truncate text-[15px] font-semibold hover:text-primary"
                              >
                                {line.listing.name}
                              </Link>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                                <span>
                                  {inr(line.listing.unitPrice)} / {line.listing.unit}
                                </span>
                                {line.listing.organic && (
                                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                                    <Leaf className="size-3" /> organic
                                  </span>
                                )}
                                <AvailabilityPill availability={line.listing.availability} />
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                aria-label="Decrease quantity"
                                className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
                                onClick={() => void changeQty(line.cartItemId, line.quantity - 1)}
                                disabled={busy === line.cartItemId || line.quantity <= 1}
                              >
                                <Minus className="size-3.5" />
                              </button>
                              <span className="w-10 text-center font-mono text-sm font-bold">
                                {busy === line.cartItemId ? "…" : fmtQty(line.quantity)}
                              </span>
                              <button
                                type="button"
                                aria-label="Increase quantity"
                                className="flex size-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-40"
                                onClick={() => void changeQty(line.cartItemId, line.quantity + 1)}
                                disabled={
                                  busy === line.cartItemId ||
                                  line.quantity >= Math.floor(line.listing.stockQty)
                                }
                              >
                                <Plus className="size-3.5" />
                              </button>
                            </div>
                            <span className="w-20 text-right font-mono text-[15px] font-bold">
                              {inr(line.quantity * line.listing.unitPrice)}
                            </span>
                            <button
                              type="button"
                              aria-label={`Remove ${line.listing.name}`}
                              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => void removeLine(line.cartItemId, line.listing.name)}
                              disabled={busy === line.cartItemId}
                            >
                              {busy === line.cartItemId ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="sticky top-24 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Order summary
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Items</span>
                  <span className="font-medium">{fmtQty(itemCount)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Farm orders</span>
                  <span className="font-medium">{list.length}</span>
                </div>
                <div className="flex items-center justify-between border-t border-dashed border-border pt-2.5">
                  <span className="font-semibold">Produce subtotal</span>
                  <span className="font-mono text-[17px] font-bold">{inr(subtotal)}</span>
                </div>
              </div>
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-accent/70 px-3 py-2.5 text-xs leading-5 text-accent-foreground">
                <Truck className="mt-0.5 size-4 shrink-0 text-primary" />
                Delivery, platform fees and coupons are calculated at checkout —
                each farm order carries its own delivery fee.
              </p>
              <Button
                size="lg"
                className="mt-4 w-full gap-2"
                disabled={all.length === 0}
                asChild
              >
                <Link to="/checkout">
                  Proceed to checkout <ArrowRight className="size-4.5" />
                </Link>
              </Button>
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
                <Lock className="size-3" /> Demo checkout — no real payment is taken
              </p>
            </div>
            <Link
              to="/fresh"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border px-4 py-3 text-[13px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              Keep browsing the market
            </Link>
          </aside>
        </div>
      </Container>
    </div>
  );
}
