import { SiteHeader } from "@/components/site-header";
import { ProductCard, type ListingRow } from "@/components/product-card";
import { OrderPill } from "@/components/status";
import { WorkspaceNav } from "@/components/workspace-nav";
import { Container, EmptyState, Loading, StatCard } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { fmtQty, inr, shortDate } from "@/lib/format";
import { useQuery } from "convex/react";
import {
  ArrowRight,
  Bell,
  IndianRupee,
  MessageSquareText,
  PackageCheck,
  ShoppingBag,
  ShoppingBasket,
  Sparkles,
  Store,
  Truck,
} from "lucide-react";
import { Link } from "react-router";
import type { Doc } from "@/convex/_generated/dataModel";

type Order = Doc<"orders">;

const BUYER_TABS = [
  { to: "/buyer", label: "Overview", end: true },
  { to: "/buyer/orders", label: "Orders" },
  { to: "/buyer/messages", label: "Messages" },
];

export default function BuyerHome() {
  const { user } = useAuth();
  const orders = useQuery(api.orders.myOrders);
  const cart = useQuery(api.cart.myCart);
  const unread = useQuery(api.notifications.unreadCount);
  const messages = useQuery(api.inquiries.myInquiries);
  const suggestions = useQuery(api.marketplace.topSelling);
  const coupons = useQuery(api.coupons.listPublicCoupons);

  if (!user?.role) return null;

  const list = orders ?? [];
  const delivered = list.filter((o) => o.status === "delivered");
  const active = list.filter((o) => o.status !== "delivered" && o.status !== "cancelled");
  const spent = delivered.reduce((s, o) => s + o.total, 0);
  const cartQty = (cart ?? []).reduce((s, c) => s + c.quantity, 0);
  const recent = list.slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Container className="py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Buyer dashboard
            </p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">
              Welcome back{user.name ? `, ${user.name.split(" ")[0]}` : ""}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted-foreground">
              Fresh harvests are listed every morning. Order before noon and
              your produce is on the way the same day.
            </p>
          </div>
          <Button size="lg" className="gap-2" asChild>
            <Link to="/fresh">
              <ShoppingBasket className="size-4.5" /> Shop the fresh market
            </Link>
          </Button>
        </div>

        <WorkspaceNav tabs={BUYER_TABS} className="mt-6" />

        {/* Quick actions */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Link
            to="/cart"
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShoppingBag className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">Your basket</span>
              <span className="block text-[13px] text-muted-foreground">
                {cartQty > 0 ? `${fmtQty(cartQty)} units ready to order` : "No items yet"}
              </span>
            </span>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/notifications"
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bell className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">Updates</span>
              <span className="block text-[13px] text-muted-foreground">
                {unread ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "All caught up"}
              </span>
            </span>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            to="/buyer/messages"
            className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MessageSquareText className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">Messages</span>
              <span className="block text-[13px] text-muted-foreground">
                {messages && messages.length > 0
                  ? `${messages.length} inquiry${messages.length === 1 ? "" : "ies"} sent to farms`
                  : "Ask a farm about bulk supply"}
              </span>
            </span>
            <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total orders" value={list.length} icon={ShoppingBag} hint="across all farms" />
          <StatCard label="In progress" value={active.length} icon={Truck} hint="placed to delivery" accent />
          <StatCard label="Delivered" value={delivered.length} icon={PackageCheck} hint="ready to review" />
          <StatCard
            label="Spent (delivered)"
            value={inr(spent)}
            icon={IndianRupee}
            hint="demo figures, no real money"
          />
        </div>

        {/* Coupons */}
        {!!coupons?.length && (
          <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary/[0.04] px-5 py-4">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Sparkles className="size-4 text-primary" /> Live offers
            </span>
            {coupons.map((c) => (
              <Link
                key={c.code}
                to="/checkout"
                title={c.description}
                className="rounded-lg border border-dashed border-primary/50 bg-card px-3 py-1.5 text-[13px] transition-colors hover:bg-primary/10"
              >
                <span className="font-mono font-bold text-primary">{c.code}</span>
                <span className="ml-2 text-muted-foreground">
                  {c.type === "percent" ? `${c.value}% off` : `${inr(c.value)} off`}
                  {c.minOrderValue > 0 && ` · min ${inr(c.minOrderValue)}`}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* Recent orders */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Recent orders</h2>
              <Button variant="ghost" size="sm" className="gap-1 text-[13px]" asChild>
                <Link to="/buyer/orders">
                  All orders <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
            <div className="mt-4">
              {orders === undefined ? (
                <Loading label="Loading orders…" />
              ) : recent.length === 0 ? (
                <EmptyState
                  icon={Store}
                  title="Your orders will appear here"
                  body="Add a fresh listing to your basket and check out — the farm confirms and dispatches from their dashboard."
                  action={
                    <Button asChild>
                      <Link to="/fresh">Browse fresh produce</Link>
                    </Button>
                  }
                />
              ) : (
                <ul className="space-y-2.5">
                  {recent.map((o) => (
                    <li key={o._id}>
                      <Link
                        to={`/orders/${o._id}`}
                        className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
                      >
                        <span className="font-mono text-[13px] font-bold text-foreground">
                          {o.number}
                        </span>
                        <span className="text-[13px] text-muted-foreground">
                          {shortDate(o.createdAt)}
                        </span>
                        <OrderPill status={o.status} />
                        <span className="text-[13px] text-muted-foreground">
                          {o.items.reduce((s, i) => s + i.qty, 0)} units ·{" "}
                          {o.items.map((i) => i.name).slice(0, 2).join(", ")}
                          {o.items.length > 2 ? "…" : ""}
                        </span>
                        <span className="ml-auto font-mono text-[15px] font-bold text-foreground">
                          {inr(o.total)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Suggestions */}
          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Popular this week</h2>
            </div>
            <div className="mt-4 space-y-3">
              {(suggestions ?? []).slice(0, 4).map((row: ListingRow) => (
                <ProductCard key={row.id} row={row} compact />
              ))}
              {suggestions !== undefined && suggestions.length === 0 && (
                <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                  New harvests land here as they sell out.
                </p>
              )}
            </div>
          </section>
        </div>
      </Container>
    </div>
  );
}
