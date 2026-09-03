import { SiteHeader } from "@/components/site-header";
import { OrderPill } from "@/components/status";
import { WorkspaceNav } from "@/components/workspace-nav";
import { Container, EmptyState, Loading } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { errMsg, fmtQty, inr, orderStatusLabel, shortDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  Check,
  Loader2,
  Package,
  PackageCheck,
  Truck,
  XCircle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel";

type Order = Doc<"orders">;

const FARMER_TABS = [
  { to: "/farmer", label: "Overview", end: true },
  { to: "/farmer/products", label: "Listings" },
  { to: "/farmer/orders", label: "Orders" },
  { to: "/farmer/inquiries", label: "Inquiries" },
  { to: "/farmer/insights", label: "Insights" },
];

const FILTERS = [
  { key: "all", label: "All orders" },
  { key: "placed", label: "New" },
  { key: "confirmed", label: "Confirmed" },
  { key: "out_for_delivery", label: "On the way" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

export default function FarmerOrders() {
  const { user } = useAuth();
  const orders = useQuery(api.orders.farmerOrders, {});
  const setStatus = useMutation(api.orders.setOrderStatus);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const list = [...(orders ?? [])];
    return filter === "all" ? list : list.filter((o) => o.status === filter);
  }, [orders, filter]);

  if (!user?.role) return null;

  const action = async (o: Order, to: string, ok: string) => {
    setBusy(`${o._id}:${to}`);
    try {
      await setStatus({ orderId: o._id as never, to });
      toast.success(`Order ${o.number} ${ok}`);
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
              Farmer dashboard
            </p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">Farm orders</h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              Accept new orders, dispatch packed lots and mark deliveries —
              buyers see every update as it happens.
            </p>
          </div>
        </div>
        <WorkspaceNav tabs={FARMER_TABS} className="mt-6" />

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
          {filter !== "all" && (
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="ml-1 text-[13px] font-medium text-muted-foreground underline-offset-2 hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <div className="mt-6 max-w-5xl">
          {orders === undefined ? (
            <Loading label="Loading farm orders…" />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Package}
              title={filter === "all" ? "No orders yet" : `No ${orderStatusLabel(filter).toLowerCase()} orders`}
              body={
                filter === "all"
                  ? "When a buyer checks out with your produce, the order lands here for you to accept and dispatch."
                  : "Nothing in this state right now — new orders arrive here the moment buyers place them."
              }
            />
          ) : (
            <ul className="space-y-3">
              {filtered.map((o) => (
                <li key={o._id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <span className="font-mono text-[13px] font-bold">{o.number}</span>
                    <span className="text-xs text-muted-foreground">{shortDateTime(o.createdAt)}</span>
                    <OrderPill status={o.status} />
                    <span className="font-mono text-[16px] font-bold">{inr(o.total)}</span>
                    <span className="ml-auto flex flex-wrap items-center gap-2">
                      {o.status === "placed" && (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          disabled={busy === `${o._id}:confirmed`}
                          onClick={() => void action(o, "confirmed", "confirmed")}
                        >
                          {busy === `${o._id}:confirmed` ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Check className="size-3.5" />
                          )}
                          Accept
                        </Button>
                      )}
                      {o.status === "confirmed" && (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          disabled={busy === `${o._id}:out_for_delivery`}
                          onClick={() => void action(o, "out_for_delivery", "dispatched")}
                        >
                          {busy === `${o._id}:out_for_delivery` ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Truck className="size-3.5" />
                          )}
                          Dispatch
                        </Button>
                      )}
                      {o.status === "out_for_delivery" && (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          disabled={busy === `${o._id}:delivered`}
                          onClick={() => void action(o, "delivered", "delivered")}
                        >
                          {busy === `${o._id}:delivered` ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <PackageCheck className="size-3.5" />
                          )}
                          Mark delivered
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1 text-[13px]"
                        asChild
                      >
                        <Link to={`/orders/${o._id}`}>
                          Details <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-dashed border-border pt-3 text-[13px] text-muted-foreground">
                    <span className="font-medium text-foreground/90">{o.buyerName}</span>
                    <span>
                      {o.buyerAddress.city}, {o.buyerAddress.state} — {o.buyerAddress.pincode}
                    </span>
                    <span>
                      {o.items.map((i) => `${fmtQty(i.qty)} ${i.unit} ${i.name}`).join(", ")}
                    </span>
                    {o.paymentStatus === "pending" && (
                      <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-700">
                        Collect ₹{inr(o.total)} on delivery
                      </span>
                    )}
                    {(o.status === "placed" || o.status === "confirmed") && (
                      <button
                        type="button"
                        className="ml-auto inline-flex items-center gap-1 text-[13px] font-medium text-destructive hover:underline disabled:opacity-50"
                        disabled={busy === `${o._id}:cancelled`}
                        onClick={() => void action(o, "cancelled", "cancelled")}
                      >
                        {busy === `${o._id}:cancelled` ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <XCircle className="size-3.5" />
                        )}
                        Cancel
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </div>
  );
}
