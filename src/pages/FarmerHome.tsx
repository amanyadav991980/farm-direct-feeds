import { SiteHeader } from "@/components/site-header";
import { OrderPill } from "@/components/status";
import { WorkspaceNav } from "@/components/workspace-nav";
import { Container, EmptyState, Loading, StatCard } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { errMsg, fmtQty, inr } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  ClipboardList,
  IndianRupee,
  Lightbulb,
  MessageSquareText,
  Package,
  PackagePlus,
  ShoppingBag,
  Store,
  TrendingUp,
  Truck,
} from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";

const FARMER_TABS = [
  { to: "/farmer", label: "Overview", end: true },
  { to: "/farmer/products", label: "Listings" },
  { to: "/farmer/orders", label: "Orders" },
  { to: "/farmer/inquiries", label: "Inquiries" },
  { to: "/farmer/insights", label: "Insights" },
];

export default function FarmerHome() {
  const { user } = useAuth();
  const farm = useQuery(api.farmers.myFarm);
  const stats = useQuery(api.analytics.farmerDashboardStats);
  const orders = useQuery(api.orders.farmerOrders, {});
  const inquiries = useQuery(api.inquiries.farmInquiries);
  const lowStock = useQuery(api.insights.lowStockAlerts);
  const adjustStock = useMutation(api.products.adjustStock);

  if (!user?.role) return null;

  const kpis = stats?.kpis;
  const actionOrders = (orders ?? []).filter((o) =>
    ["placed", "confirmed"].includes(o.status),
  );
  const underway = (orders ?? []).filter((o) => o.status === "out_for_delivery");
  const openInquiries = (inquiries ?? []).filter((i) => !i.handled);

  const restock = async (productId: string, name: string) => {
    try {
      await adjustStock({ productId: productId as never, delta: 200 });
      toast.success(`${name} restocked by 200 units`);
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Container className="py-10">
        {/* Farm identity header */}
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-accent text-xl font-bold text-accent-foreground">
              {(farm?.farmName ?? "F").charAt(0)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold sm:text-3xl">{farm?.farmName ?? "Your farm"}</h1>
                {farm?.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    <BadgeCheck className="size-3" /> Verified
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Verification pending
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {farm
                  ? `${farm.village}, ${farm.district}, ${farm.state} · farming for ${farm.yearsFarming} years`
                  : "Loading farm profile…"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {farm && (
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <Link to={`/farmer/${farm.id}`}>
                  <Store className="size-4" /> Public farm page
                </Link>
              </Button>
            )}
            <Button size="sm" className="gap-1.5" asChild>
              <Link to="/farmer/product/new">
                <PackagePlus className="size-4" /> List a crop
              </Link>
            </Button>
          </div>
        </div>

        <WorkspaceNav tabs={FARMER_TABS} className="mt-6" />

        {/* KPI grid */}
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Live listings"
            value={kpis ? fmtQty(kpis.totalProducts) : "—"}
            icon={Package}
            hint={kpis ? `${fmtQty(kpis.stockUnits)} units in stock` : undefined}
          />
          <StatCard
            label="Earnings"
            value={kpis ? inr(kpis.earnings) : "—"}
            icon={IndianRupee}
            hint="settled on delivered orders"
            accent
          />
          <StatCard
            label="Orders to fulfil"
            value={kpis ? fmtQty(kpis.pendingOrders + kpis.underwayOrders) : "—"}
            icon={ClipboardList}
            hint={
              kpis
                ? `${kpis.pendingOrders} awaiting action · ${kpis.underwayOrders} on the road`
                : undefined
            }
          />
          <StatCard
            label="Total sales"
            value={kpis ? inr(kpis.totalSales) : "—"}
            icon={TrendingUp}
            hint={kpis ? `across ${fmtQty(kpis.totalOrders)} orders` : undefined}
          />
        </div>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-2">
          {/* Orders needing attention */}
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <ShoppingBag className="size-5 text-primary" /> Order queue
              </h2>
              <Button variant="ghost" size="sm" className="gap-1 text-[13px]" asChild>
                <Link to="/farmer/orders">
                  Manage orders <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
            <div className="mt-4">
              {orders === undefined ? (
                <Loading label="Checking orders…" />
              ) : actionOrders.length === 0 && underway.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
                  No pending orders right now. New buyer orders appear here and
                  you get a notification the moment they land.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {[...actionOrders, ...underway]
                    .sort((a, b) => a.createdAt - b.createdAt)
                    .slice(0, 5)
                    .map((o) => (
                      <li key={o._id}>
                        <Link
                          to={`/orders/${o._id}`}
                          className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                        >
                          <span className="font-mono text-[13px] font-bold">{o.number}</span>
                          <OrderPill status={o.status} />
                          <span className="text-[13px] text-muted-foreground">
                            {o.buyerName} · {o.items.reduce((s, i) => s + i.qty, 0)} units
                          </span>
                          <span className="ml-auto font-mono text-[15px] font-bold">
                            {inr(o.total)}
                          </span>
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </section>

          {/* Low stock + insights */}
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Boxes className="size-5 text-primary" /> Stock watch
              </h2>
              <Button variant="ghost" size="sm" className="gap-1 text-[13px]" asChild>
                <Link to="/farmer/products">
                  Listings <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
            <div className="mt-4 space-y-2.5">
              {lowStock === undefined ? (
                <Loading label="Checking stock…" />
              ) : lowStock.length === 0 ? (
                <p className="flex items-start gap-3 rounded-xl border border-dashed border-border px-5 py-8 text-sm text-muted-foreground">
                  <Truck className="mt-0.5 size-4 shrink-0 text-primary" />
                  Every listing is healthy. Restock fast-sellers early to keep
                  the “available” badge on your crops.
                </p>
              ) : (
                lowStock.slice(0, 4).map((s) => (
                  <div
                    key={s.productId}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4"
                  >
                    <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-lg">
                      {s.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.status === "out" ? "Out of stock" : "Low stock"} — {fmtQty(s.stockQty)}{" "}
                        {s.unit} left
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void restock(s.productId, s.name)}
                    >
                      Restock
                    </Button>
                  </div>
                ))
              )}
            </div>

            {openInquiries.length > 0 && (
              <Link
                to="/farmer/inquiries"
                className="mt-4 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/[0.04] p-4 transition-colors hover:bg-primary/[0.07]"
              >
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MessageSquareText className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{openInquiries.length} new message{openInquiries.length === 1 ? "" : "s"} from buyers</p>
                  <p className="text-xs text-muted-foreground">Bulk enquiries often become repeat orders.</p>
                </div>
                <ArrowRight className="size-4 text-primary" />
              </Link>
            )}
          </section>
        </div>

        {/* Insight hint */}
        <div className="mt-10 flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card px-5 py-4">
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-primary">
            <Lightbulb className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold">Planning the next harvest?</p>
            <p className="text-[13px] text-muted-foreground">
              The insights workspace forecasts seven-day demand from order
              history and compares your prices against the platform average.
            </p>
          </div>
          <Button variant="outline" className="gap-1.5" asChild>
            <Link to="/farmer/insights">
              Open insights <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

      </Container>
    </div>
  );
}
