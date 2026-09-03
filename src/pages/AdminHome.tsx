import { SiteHeader } from "@/components/site-header";
import { OrderPill, TonePill, Verified } from "@/components/status";
import { Container, Loading, StatCard } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { errMsg, fmtQty, inr, shortDate, shortDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAction, useMutation, useQuery } from "convex/react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  BadgeCheck,
  Banknote,
  Boxes,
  CircleDollarSign,
  LayoutGrid,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  Ticket,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel";

const CATEGORIES = ["Vegetables", "Fruits", "Grains", "Pulses", "Oilseeds", "Other"] as const;

const TABS = [
  { key: "", label: "Overview", icon: LayoutGrid },
  { key: "coupons", label: "Coupons", icon: Ticket },
  { key: "farms", label: "Farms & FPOs", icon: Store },
  { key: "settings", label: "Platform settings", icon: Settings },
] as const;

function toDateInput(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export default function AdminHome() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") ?? "";

  if (!user?.role) return null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Container className="py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <ShieldCheck className="size-4" /> Platform operator
            </p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">Marketplace command centre</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
              Live numbers across farms, produce and orders — coupons, grower
              performance and platform pricing from one place.
            </p>
          </div>
        </div>

        <nav className="mt-6 flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card p-1.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() =>
                setSearchParams(t.key ? { tab: t.key } : {}, { replace: true })
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors",
                tab === t.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          ))}
        </nav>

        <div className="mt-8">
          {tab === "coupons" ? (
            <CouponsTab />
          ) : tab === "farms" ? (
            <FarmsTab />
          ) : tab === "settings" ? (
            <SettingsTab />
          ) : (
            <OverviewTab />
          )}
        </div>
      </Container>
    </div>
  );
}

/* ───────────────────────────── Overview ───────────────────────────── */

function OverviewTab() {
  const stats = useQuery(api.analytics.adminStats);
  const k = stats?.kpis;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Delivered GMV" value={k ? inr(k.revenue) : "—"} icon={CircleDollarSign} hint={k ? `₹${(k.revenue / 100000).toFixed(1)} lakh moved` : undefined} accent />
        <StatCard label="Platform fees" value={k ? inr(k.fees) : "—"} icon={Banknote} hint="earned on delivered orders" />
        <StatCard label="Orders delivered" value={k ? fmtQty(k.deliveredOrders) : "—"} icon={Package} hint={k ? `${fmtQty(k.cancelled)} cancelled` : undefined} />
        <StatCard label="Registered buyers" value={k ? fmtQty(k.buyers) : "—"} icon={Users} hint={k ? `${fmtQty(k.farmerUsers)} farmer accounts` : undefined} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Partner farms" value={k ? fmtQty(k.farmers) : "—"} icon={Store} hint={k ? `${fmtQty(k.verifiedFarmers)} verified` : undefined} />
        <StatCard label="Live listings" value={k ? fmtQty(k.activeProductsCount) : "—"} icon={Boxes} hint={k ? `${fmtQty(k.outOfStock)} sold out now` : undefined} />
        <StatCard label="Discounts given" value={k ? inr(k.discountGiven) : "—"} icon={Tag} hint="market + coupon discounts" />
        <StatCard label="Active coupons" value={k ? fmtQty(k.coupons) : "—"} icon={Ticket} hint="configured in the coupons tab" />
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-bold">
            <TrendingUp className="size-4.5 text-primary" /> Order volume — 30 days
          </h2>
          {stats === undefined ? (
            <Loading label="Building chart…" className="py-20" />
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.ordersSeries} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fdAdmin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#166534" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#166534" stopOpacity={0.03} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#dcd8c9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#646b5d" }} tickLine={false} axisLine={false} interval={4} />
                  <YAxis tick={{ fontSize: 11, fill: "#646b5d" }} tickLine={false} axisLine={false} />
                  <Tooltip
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
                          <p className="font-semibold">{label}</p>
                          <p className="mt-0.5 text-muted-foreground">
                            Orders: <span className="font-mono font-bold text-foreground">{payload[0]?.value}</span>
                          </p>
                        </div>
                      ) : null
                    }
                  />
                  <Area type="monotone" dataKey="orders" name="Orders" stroke="#166534" strokeWidth={2} fill="url(#fdAdmin)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="flex items-center gap-2 text-[15px] font-bold">
            <ShoppingBag className="size-4.5 text-primary" /> Top produce
          </h2>
          {stats === undefined ? (
            <Loading label="Crunching numbers…" className="py-16" />
          ) : stats.topProducts.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No delivered orders yet.</p>
          ) : (
            <ul className="mt-4 space-y-3.5">
              {stats.topProducts.map((p, i) => (
                <li key={p.name} className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-lg">{p.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground">{fmtQty(p.qty)} units delivered</p>
                  </div>
                  <span className="font-mono text-[13px] font-bold">{inr(p.value)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-[15px] font-bold">
          <Package className="size-4.5 text-primary" /> Recent orders
        </h2>
        {stats === undefined ? (
          <Loading label="Loading recent orders…" />
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2.5 pr-4 font-semibold">Order</th>
                  <th className="pb-2.5 pr-4 font-semibold">Buyer</th>
                  <th className="pb-2.5 pr-4 font-semibold">Placed</th>
                  <th className="pb-2.5 pr-4 font-semibold">Status</th>
                  <th className="pb-2.5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-dashed border-border/70 last:border-0">
                    <td className="py-2.5 pr-4">
                      <Link to={`/orders/${o.id}`} className="font-mono text-[12.5px] font-bold text-primary hover:underline">
                        {o.number}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 font-medium">{o.buyerName}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground">{shortDate(o.createdAt)}</td>
                    <td className="py-2.5 pr-4"><OrderPill status={o.status} /></td>
                    <td className="py-2.5 text-right font-mono font-bold">{inr(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ───────────────────────────── Coupons ───────────────────────────── */

type Coupon = Doc<"coupons">;

function emptyForm() {
  const now = Date.now();
  return {
    id: undefined as string | undefined,
    code: "",
    title: "",
    description: "",
    type: "percent" as "percent" | "fixed",
    value: "10",
    minOrderValue: "0",
    maxDiscount: "0",
    categoryRestriction: "",
    newBuyerOnly: false,
    startDate: toDateInput(now),
    expiryDate: toDateInput(now + 30 * 24 * 60 * 60 * 1000),
    usageLimit: "",
    perUserLimit: "",
    isActive: true,
  };
}

function CouponsTab() {
  const coupons = useQuery(api.coupons.adminListCoupons);
  const save = useMutation(api.coupons.adminSaveCoupon);
  const toggle = useMutation(api.coupons.adminToggleCoupon);
  const remove = useMutation(api.coupons.adminDeleteCoupon);
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState<string | null>(null);

  const editing = !!form.id;

  const set = <K extends keyof ReturnType<typeof emptyForm>>(k: K, v: ReturnType<typeof emptyForm>[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (form.code.trim().length < 3) {
      toast.error("Coupon code needs at least 3 characters.");
      return;
    }
    const value = Number(form.value);
    if (!value || value <= 0) {
      toast.error("Give the coupon a value above zero.");
      return;
    }
    setBusy("save");
    try {
      await save({
        id: form.id as never,
        code: form.code,
        title: form.title || form.code,
        description: form.description || `${form.type === "percent" ? `${value}%` : `${inr(value)}`} off your fresh produce order.`,
        type: form.type,
        value,
        minOrderValue: Math.max(0, Number(form.minOrderValue) || 0),
        maxDiscount: Math.max(0, Number(form.maxDiscount) || 0),
        categoryRestriction: form.categoryRestriction || undefined,
        newBuyerOnly: form.newBuyerOnly,
        startDate: new Date(`${form.startDate}T00:00:00`).getTime(),
        expiryDate: new Date(`${form.expiryDate}T23:59:59`).getTime(),
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : undefined,
        isActive: form.isActive,
      });
      toast.success(editing ? "Coupon updated" : `Coupon ${form.code.toUpperCase()} created`);
      setForm(emptyForm());
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const edit = (c: Coupon) => {
    setForm({
      id: c._id,
      code: c.code,
      title: c.title,
      description: c.description,
      type: c.type,
      value: String(c.value),
      minOrderValue: String(c.minOrderValue),
      maxDiscount: String(c.maxDiscount),
      categoryRestriction: c.categoryRestriction ?? "",
      newBuyerOnly: c.newBuyerOnly,
      startDate: toDateInput(c.startDate),
      expiryDate: toDateInput(c.expiryDate),
      usageLimit: c.usageLimit !== undefined ? String(c.usageLimit) : "",
      perUserLimit: c.perUserLimit !== undefined ? String(c.perUserLimit) : "",
      isActive: c.isActive,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="grid items-start gap-8 xl:grid-cols-[0.9fr_1.1fr]">
      {/* Editor */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-[17px] font-bold">
          {editing ? <Pencil className="size-4.5 text-primary" /> : <Plus className="size-4.5 text-primary" />}
          {editing ? `Edit ${form.code}` : "New coupon"}
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="co-code">Code</Label>
            <Input id="co-code" className="mt-1.5 font-mono uppercase" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="e.g. FRESH10" />
          </div>
          <div>
            <Label htmlFor="co-type">Type</Label>
            <select
              id="co-type"
              value={form.type}
              onChange={(e) => set("type", e.target.value as "percent" | "fixed")}
              className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none"
            >
              <option value="percent">Percentage off</option>
              <option value="fixed">Fixed ₹ off</option>
            </select>
          </div>
          <div>
            <Label htmlFor="co-value">{form.type === "percent" ? "Percent off" : "₹ off"} (per eligible basket)</Label>
            <Input id="co-value" className="mt-1.5 font-mono" type="number" min={1} value={form.value} onChange={(e) => set("value", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="co-min">Minimum order value (₹)</Label>
            <Input id="co-min" className="mt-1.5 font-mono" type="number" min={0} value={form.minOrderValue} onChange={(e) => set("minOrderValue", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="co-max">Maximum discount cap (₹, 0 = none)</Label>
            <Input id="co-max" className="mt-1.5 font-mono" type="number" min={0} value={form.maxDiscount} onChange={(e) => set("maxDiscount", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="co-cat">Category restriction</Label>
            <select
              id="co-cat"
              value={form.categoryRestriction}
              onChange={(e) => set("categoryRestriction", e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none"
            >
              <option value="">Any category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="co-start">Starts</Label>
            <Input id="co-start" className="mt-1.5" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="co-end">Expires</Label>
            <Input id="co-end" className="mt-1.5" type="date" value={form.expiryDate} onChange={(e) => set("expiryDate", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="co-uses">Total usage limit (blank = unlimited)</Label>
            <Input id="co-uses" className="mt-1.5 font-mono" type="number" min={1} value={form.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} placeholder="e.g. 200" />
          </div>
          <div>
            <Label htmlFor="co-per">Per buyer limit (blank = unlimited)</Label>
            <Input id="co-per" className="mt-1.5 font-mono" type="number" min={1} value={form.perUserLimit} onChange={(e) => set("perUserLimit", e.target.value)} placeholder="e.g. 1" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.newBuyerOnly}
              onChange={(e) => set("newBuyerOnly", e.target.checked)}
              className="size-4 accent-primary"
            />
            First order only
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="size-4 accent-primary"
            />
            Active immediately
          </label>
        </div>

        <div className="mt-4">
          <Label htmlFor="co-title">Public title (shown at checkout)</Label>
          <Input id="co-title" className="mt-1.5" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. First basket welcome" />
        </div>
        <div className="mt-4">
          <Label htmlFor="co-desc">Description</Label>
          <Input id="co-desc" className="mt-1.5" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Shown when a buyer applies the code" />
        </div>

        <div className="mt-5 flex gap-2 border-t border-dashed border-border pt-5">
          <Button className="gap-2" disabled={busy === "save"} onClick={() => void submit()}>
            {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {editing ? "Save changes" : "Create coupon"}
          </Button>
          {editing && (
            <Button variant="ghost" onClick={() => setForm(emptyForm())}>
              Cancel edit
            </Button>
          )}
        </div>
      </section>

      {/* List */}
      <section className="space-y-3">
        {coupons === undefined ? (
          <Loading label="Loading coupons…" className="rounded-2xl border border-border bg-card" />
        ) : coupons.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-6 py-14 text-center text-sm text-muted-foreground">
            No coupons configured. Create one to run a launch or season offer.
          </p>
        ) : (
          coupons.map((c) => {
            const live =
              c.isActive && c.startDate <= Date.now() && c.expiryDate >= Date.now();
            return (
              <article key={c._id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-lg border border-dashed border-primary/60 bg-primary/5 px-2.5 py-1 font-mono text-[13px] font-bold text-primary">
                    {c.code}
                  </span>
                  <span className="font-mono text-[12px] text-muted-foreground">
                    {c.type === "percent" ? `${c.value}% off` : `${inr(c.value)} off`}
                    {c.minOrderValue > 0 && ` · min ${inr(c.minOrderValue)}`}
                  </span>
                  {c.categoryRestriction && (
                    <TonePill tone="info">{c.categoryRestriction}</TonePill>
                  )}
                  {c.newBuyerOnly && <TonePill tone="warn">first order</TonePill>}
                  {live ? <TonePill tone="ok">live</TonePill> : <TonePill tone="muted">{c.isActive ? "scheduled" : "paused"}</TonePill>}
                </div>
                <p className="mt-2 text-sm font-semibold text-foreground">{c.title}</p>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{c.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px] text-muted-foreground">
                  <span>{shortDate(c.startDate)} → {shortDate(c.expiryDate)}</span>
                  <span className="font-mono">
                    used {fmtQty(c.usageCount)}
                    {c.usageLimit !== undefined ? ` / ${fmtQty(c.usageLimit)}` : ""}
                  </span>
                  {c.perUserLimit !== undefined && <span>1× per buyer</span>}
                  <span className="ml-auto flex gap-1">
                    <Button size="sm" variant="ghost" className="gap-1.5 text-[12.5px]" onClick={() => edit(c)}>
                      <Pencil className="size-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-[12.5px]"
                      disabled={busy === `toggle-${c._id}`}
                      onClick={async () => {
                        setBusy(`toggle-${c._id}`);
                        try {
                          await toggle({ id: c._id as never });
                          toast.success(c.isActive ? "Coupon paused" : "Coupon activated");
                        } catch (e) {
                          toast.error(errMsg(e));
                        } finally {
                          setBusy(null);
                        }
                      }}
                    >
                      {busy === `toggle-${c._id}` ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="size-3.5" />
                      )}
                      {c.isActive ? "Pause" : "Activate"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1.5 text-[12.5px] text-destructive hover:text-destructive"
                      disabled={busy === `del-${c._id}`}
                      onClick={async () => {
                        setBusy(`del-${c._id}`);
                        try {
                          await remove({ id: c._id as never });
                          toast.success(`${c.code} deleted`);
                        } catch (e) {
                          toast.error(errMsg(e));
                        } finally {
                          setBusy(null);
                        }
                      }}
                    >
                      {busy === `del-${c._id}` ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                      Delete
                    </Button>
                  </span>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

/* ───────────────────────────── Farms ───────────────────────────── */

function FarmsTab() {
  const ranking = useQuery(api.analytics.farmerRanking);
  const kpis = ranking;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Grower performance</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranked by delivered order value across the marketplace.
          </p>
        </div>
        {kpis && (
          <span className="rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] text-muted-foreground">
            <span className="font-mono font-bold text-foreground">{kpis.length}</span> farms tracked
          </span>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {ranking === undefined ? (
          <Loading label="Ranking farms…" className="py-20" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-card/70 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-semibold">#</th>
                  <th className="px-4 py-3 font-semibold">Farm</th>
                  <th className="px-4 py-3 font-semibold">Location</th>
                  <th className="px-4 py-3 font-semibold">Rating</th>
                  <th className="px-4 py-3 text-right font-semibold">Delivered orders</th>
                  <th className="px-5 py-3 text-right font-semibold">GMV</th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((f, i) => (
                  <tr key={f.id} className="border-b border-dashed border-border/70 last:border-0 hover:bg-muted/30">
                    <td className="px-5 py-3 font-mono text-xs font-bold text-muted-foreground">{String(i + 1).padStart(2, "0")}</td>
                    <td className="px-4 py-3">
                      <Link to={`/farmer/${f.id}`} className="flex items-center gap-2.5 font-semibold hover:text-primary">
                        <span className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                          {f.farmName.charAt(0)}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            {f.farmName}
                            {f.verified && <BadgeCheck className="size-3.5 text-primary" />}
                          </span>
                          <span className="block text-[11px] font-normal text-muted-foreground">{f.name}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground">
                        <MapPin className="size-3.5" />
                        {f.village}, {f.district}, {f.state}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {f.ratingAvg > 0 ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[13px] font-bold text-amber-700">
                          ★ {f.ratingAvg.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">New</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{fmtQty(f.orderCount)}</td>
                    <td className="px-5 py-3 text-right font-mono font-bold">{inr(f.gmv)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Verified verified /> badges mark farms verified by the platform.
      </p>
    </section>
  );
}

/* ───────────────────────────── Settings ───────────────────────────── */

function SettingsTab() {
  const settings = useQuery(api.settings.getSettings);
  const update = useMutation(api.settings.updateSettings);
  const sync = useAction(api.settings.syncMarketPrices);
  const [discount, setDiscount] = useState("");
  const [fee, setFee] = useState("");
  const [delivery, setDelivery] = useState("");
  const [mode, setMode] = useState<"demo" | "live">("demo");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [init, setInit] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  if (settings && !init) {
    setInit(true);
    setDiscount(String(settings.marketDiscountPercent));
    setFee(String(settings.platformFeePercent));
    setDelivery(String(settings.deliveryFee));
    setMode(settings.marketMode);
    setLabel(settings.marketSourceLabel);
    setUrl(settings.marketSourceUrl ?? "");
  }

  const save = async () => {
    setBusy("save");
    try {
      await update({
        marketDiscountPercent: Math.min(50, Math.max(0, Number(discount) || 0)),
        platformFeePercent: Math.min(10, Math.max(0, Number(fee) || 0)),
        deliveryFee: Math.max(0, Number(delivery) || 0),
        marketMode: mode,
        marketSourceLabel: label || "Demo mandi price index (not live)",
        marketSourceUrl: url.trim() || undefined,
      });
      toast.success("Platform settings saved — new quotes and listings use them immediately");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const runSync = async () => {
    setBusy("sync");
    setSyncResult(null);
    try {
      const res = (await sync()) as unknown as {
        ok: boolean;
        mode?: string;
        note?: string;
        error?: string;
      };
      if (res.ok && res.mode === "demo") {
        setSyncResult("Demo mode — configure a live market API URL and flip the mode to live, then re-run.");
      } else if (res.ok) {
        setSyncResult(`Live sync OK · ${res.note ?? "source responding"}`);
      } else {
        setSyncResult(`Sync failed: ${res.error ?? "unknown error"}`);
      }
      toast.success("Market price sync attempted");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-[17px] font-bold">
          <Settings className="size-4.5 text-primary" /> Pricing rules
        </h2>
        {settings === undefined ? (
          <Loading label="Loading settings…" className="py-16" />
        ) : (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="s-discount">Farm-gate discount (%)</Label>
                <Input id="s-discount" className="mt-1.5 font-mono" type="number" min={0} max={50} value={discount} onChange={(e) => setDiscount(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="s-fee">Platform fee (%)</Label>
                <Input id="s-fee" className="mt-1.5 font-mono" type="number" min={0} max={10} value={fee} onChange={(e) => setFee(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="s-delivery">Flat delivery fee (₹)</Label>
                <Input id="s-delivery" className="mt-1.5 font-mono" type="number" min={0} value={delivery} onChange={(e) => setDelivery(e.target.value)} />
              </div>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Buyers see listings at the market rate less the farm-gate
              discount. Every order adds the platform fee plus one delivery fee
              per farm order.
            </p>
            <Button className="mt-5 gap-2" disabled={busy === "save"} onClick={() => void save()}>
              {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save pricing rules
            </Button>
          </>
        )}
      </section>

      <section className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-[17px] font-bold">
            <RefreshCw className="size-4.5 text-primary" /> Market price source
          </h2>
          {settings === undefined ? (
            <Loading label="Loading…" className="py-12" />
          ) : (
            <>
              <div className="mt-4 flex items-center gap-2">
                <TonePill tone={mode === "live" ? "ok" : "muted"} dot>
                  {mode === "live" ? "live source" : "demo index"}
                </TonePill>
                <span className="text-xs text-muted-foreground">
                  {mode === "live" ? "listings priced from your source" : "prices are the demo mandi index"}
                </span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="s-mode">Market mode</Label>
                  <select
                    id="s-mode"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as "demo" | "live")}
                    className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none"
                  >
                    <option value="demo">Demo mode (safe default)</option>
                    <option value="live">Live market source</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="s-label">Source label shown to buyers</Label>
                  <Input id="s-label" className="mt-1.5" value={label} onChange={(e) => setLabel(e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="s-url">Live market API URL (optional)</Label>
                  <Input id="s-url" className="mt-1.5 font-mono text-[13px]" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://api.example.com/mandi-prices" />
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button variant="outline" className="gap-2" disabled={busy === "sync"} onClick={() => void runSync()}>
                  {busy === "sync" ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  Test sync now
                </Button>
                <Button className="gap-2" disabled={busy === "save"} onClick={() => void save()}>
                  {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save source settings
                </Button>
              </div>
              {syncResult && (
                <p className="mt-3 rounded-xl bg-muted/70 px-3.5 py-2.5 text-[13px] leading-5 text-muted-foreground">
                  {syncResult}
                </p>
              )}
              {settings.marketLastSync && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Last sync attempt: {shortDateTime(settings.marketLastSync)}
                </p>
              )}
            </>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-primary">
              <Sparkles className="size-4.5" />
            </span>
            <div>
              <p className="text-[15px] font-bold">How market prices flow</p>
              <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
                Farmers list at the market rate, the platform applies the
                farm-gate discount and buyers see one selling price. Switching
                to live mode expects the source URL to return JSON that maps to
                crop slugs.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
