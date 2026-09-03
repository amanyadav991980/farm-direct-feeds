import { SiteHeader } from "@/components/site-header";
import { OrderPill } from "@/components/status";
import { WorkspaceNav } from "@/components/workspace-nav";
import { Container, EmptyState, Loading } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { fmtQty, inr, orderStatusLabel, shortDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  IndianRupee,
  Package,
  PartyPopper,
  Star,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router";
import type { Doc } from "@/convex/_generated/dataModel";

type Order = Doc<"orders">;

const BUYER_TABS = [
  { to: "/buyer", label: "Overview", end: true },
  { to: "/buyer/orders", label: "Orders" },
  { to: "/buyer/messages", label: "Messages" },
];

const FILTERS = [
  { key: "all", label: "All orders" },
  { key: "placed", label: "Awaiting confirmation" },
  { key: "confirmed", label: "Confirmed" },
  { key: "out_for_delivery", label: "On the way" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

export default function BuyerOrders() {
  const { user } = useAuth();
  const orders = useQuery(api.orders.myOrders);
  const location = useLocation();
  const [filter, setFilter] = useState("all");

  const placed = (location.state as { placed?: { numbers?: string[]; total?: number } } | null)
    ?.placed;

  const filtered = useMemo(() => {
    const list = [...(orders ?? [])];
    if (filter === "all") return list;
    return list.filter((o) => o.status === filter);
  }, [orders, filter]);

  if (!user?.role) return null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Container className="py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Buyer dashboard
            </p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">Your orders</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Every order is tracked from placement through farm dispatch to delivery.
            </p>
          </div>
        </div>
        <WorkspaceNav tabs={BUYER_TABS} className="mt-6" />

        {placed && (
          <div className="mt-7 overflow-hidden rounded-2xl border border-primary/30 bg-primary/[0.05]">
            <div className="flex flex-col gap-5 px-6 py-6 sm:flex-row sm:items-center">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <PartyPopper className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold">Order placed — thank you!</p>
                <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
                  {placed.numbers?.length
                    ? `Your basket became ${placed.numbers.length === 1 ? "order" : `${placed.numbers.length} farm orders`} ${placed.numbers.join(", ")}.`
                    : "Your order is in."}{" "}
                  The farms have been notified and will confirm shortly. You can
                  track every step right here.
                </p>
              </div>
              <div className="shrink-0 rounded-xl border border-border bg-card px-4 py-3 text-center">
                <p className="flex items-center justify-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <IndianRupee className="size-3" /> Total
                </p>
                <p className="font-mono text-xl font-bold">{inr(placed.total ?? 0)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Status filter */}
        <div className="mt-7 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                filter === f.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-6 max-w-4xl">
          {orders === undefined ? (
            <Loading label="Loading your orders…" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Package}
              title={filter === "all" ? "No orders yet" : `No ${orderStatusLabel(filter).toLowerCase()} orders`}
              body={
                filter === "all"
                  ? "When you check out, your orders appear here with live status tracking."
                  : "Try another filter or head to the market for a fresh basket."
              }
              action={
                <Button asChild>
                  <Link to="/fresh">Browse fresh produce</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {filtered.map((o: Order) => (
                <li key={o._id}>
                  <Link
                    to={`/orders/${o._id}`}
                    className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40 sm:p-5"
                  >
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      <span className="font-mono text-[13px] font-bold">{o.number}</span>
                      <span className="text-xs text-muted-foreground">{shortDateTime(o.createdAt)}</span>
                      <OrderPill status={o.status} />
                      {o.paymentStatus === "refunded" && (
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-red-700">
                          refunded
                        </span>
                      )}
                      <span className="ml-auto font-mono text-[16px] font-bold">{inr(o.total)}</span>
                    </div>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t border-dashed border-border pt-2.5 text-[13px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        {o.items.slice(0, 3).map((it) => (
                          <span key={it.productId} className="inline-flex items-center gap-1">
                            <span>{it.emoji}</span>
                            <span className="font-medium text-foreground/90">{fmtQty(it.qty)} {it.unit}</span>
                            <span className="hidden sm:inline">{it.name}</span>
                          </span>
                        ))}
                        {o.items.length > 3 && <span>+{o.items.length - 3} more</span>}
                      </span>
                      {o.status === "delivered" && (
                        <span className="ml-auto inline-flex items-center gap-1.5 font-semibold text-primary">
                          <Star className="size-3.5 fill-current" /> Review this farm
                          <ArrowRight className="size-3.5" />
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {(orders ?? []).some((o) => o.status === "delivered") && (
          <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4.5 text-primary" />
            Delivered orders can be reviewed — ratings build the farm&apos;s
            standing and help other buyers choose.
            <BadgeCheck className="ml-auto size-4 text-primary/60" />
          </div>
        )}
      </Container>
    </div>
  );
}
