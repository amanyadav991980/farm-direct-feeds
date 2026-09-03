import { SiteHeader } from "@/components/site-header";
import { WorkspaceNav } from "@/components/workspace-nav";
import { Container, Loading } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { fmtQty, inr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  CircleDollarSign,
  Info,
  Lightbulb,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router";

const FARMER_TABS = [
  { to: "/farmer", label: "Overview", end: true },
  { to: "/farmer/products", label: "Listings" },
  { to: "/farmer/orders", label: "Orders" },
  { to: "/farmer/inquiries", label: "Inquiries" },
  { to: "/farmer/insights", label: "Insights" },
];

function TooltipCard({ active, payload, label }: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-foreground">{label ?? payload[0]?.name}</p>
      {payload.map((p, i) => (
        <p key={i} className="mt-0.5 text-muted-foreground">
          {p.name}: <span className="font-mono font-bold text-foreground">{inr(p.value ?? 0)}</span>
        </p>
      ))}
    </div>
  );
}

const DIR_META = {
  up: { icon: TrendingUp, tone: "text-emerald-700 bg-emerald-100", label: "Rising demand" },
  down: { icon: TrendingDown, tone: "text-red-700 bg-red-100", label: "Cooling demand" },
  flat: { icon: Minus, tone: "text-stone-600 bg-stone-200/70", label: "Steady" },
};

const PRICE_TONE = {
  raise: "bg-emerald-100 text-emerald-800",
  hold: "bg-stone-200/70 text-stone-700",
  cut: "bg-amber-100 text-amber-800",
};

const CHART_GREENS = ["#166534", "#4e7d58", "#b07d1e", "#6d9471", "#c9b458", "#8a9b5e"];

export default function FarmerInsights() {
  const { user } = useAuth();
  const stats = useQuery(api.analytics.farmerDashboardStats);
  const demand = useQuery(api.insights.demandForecast);
  const prices = useQuery(api.insights.priceRecommendations);

  if (!user?.role) return null;

  const sales = stats?.salesSeries ?? [];
  const top = stats?.productPerformance ?? [];
  const maxTop = Math.max(1, ...top.map((t) => t.value));
  const forecast = demand?.rows ?? [];
  const maxForecast = Math.max(1, ...forecast.map((f) => f.forecast7));
  const priceRows = prices?.rows ?? [];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Container className="py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Farmer dashboard
            </p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">Insights</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
              Demand forecasting and price guidance computed from live order
              history. The engine is transparent and heuristic today — the same
              surface plugs into a trained model later.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs text-muted-foreground">
            <BrainCircuit className="size-4 text-primary" />
            Engine: <span className="font-mono font-bold text-foreground">{demand?.model ?? "loading…"}</span>
          </div>
        </div>
        <WorkspaceNav tabs={FARMER_TABS} className="mt-6" />

        {/* Charts row */}
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-bold">
              <CalendarClock className="size-4.5 text-primary" /> Farm sales — last 30 days
            </h2>
            {stats === undefined ? (
              <Loading label="Building the chart…" className="py-20" />
            ) : sales.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Sales appear here once your first orders move.
              </p>
            ) : (
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sales} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fdSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#166534" stopOpacity={0.28} />
                        <stop offset="100%" stopColor="#166534" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dcd8c9" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#646b5d" }} tickLine={false} axisLine={false} interval={4} />
                    <YAxis tick={{ fontSize: 11, fill: "#646b5d" }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `₹${v}`} />
                    <Tooltip content={<TooltipCard />} />
                    <Area type="monotone" dataKey="value" name="Sales" stroke="#166534" strokeWidth={2} fill="url(#fdSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="flex items-center gap-2 text-[15px] font-bold">
              <CircleDollarSign className="size-4.5 text-primary" /> Product performance
            </h2>
            {stats === undefined ? (
              <Loading label="Analysing your crops…" className="py-20" />
            ) : top.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Delivered orders unlock per-crop performance here.
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {top.map((t, i) => (
                  <li key={t.name}>
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="flex min-w-0 items-center gap-2 font-semibold">
                        <span className="text-base">{t.emoji}</span>
                        <span className="truncate">{t.name}</span>
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {fmtQty(t.qty)} units · <span className="font-mono font-bold text-foreground">{inr(t.value)}</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(t.value / maxTop) * 100}%`,
                          backgroundColor: CHART_GREENS[i % CHART_GREENS.length],
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Demand forecast */}
        <section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Sparkles className="size-5 text-primary" /> 7-day demand forecast
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {demand?.note ?? "Comparing the last 30 days of orders against the previous 60."}
              </p>
            </div>
          </div>
          {demand === undefined ? (
            <Loading label="Forecasting demand…" />
          ) : forecast.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
              More delivered orders across the market will unlock the forecast.
            </p>
          ) : (
            <div className="mt-6 grid gap-x-8 gap-y-6 lg:grid-cols-[1fr_1fr]">
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={forecast.slice(0, 8)} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dcd8c9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#646b5d" }} tickLine={false} axisLine={false} interval={0} angle={-18} textAnchor="end" height={46} />
                    <YAxis tick={{ fontSize: 11, fill: "#646b5d" }} tickLine={false} axisLine={false} />
                    <Tooltip content={<TooltipCard />} />
                    <Bar dataKey="forecast7" name="Forecast 7d" radius={[6, 6, 0, 0]}>
                      {forecast.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={CHART_GREENS[i % CHART_GREENS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2.5">
                {forecast.slice(0, 10).map((f) => {
                  const meta = DIR_META[f.direction as keyof typeof DIR_META] ?? DIR_META.flat;
                  return (
                    <li
                      key={f.name}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card/60 px-3.5 py-2.5"
                    >
                      <span className="text-lg">{f.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold">{f.name}</p>
                        <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${Math.max(6, (f.forecast7 / maxForecast) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[15px] font-bold">
                          {fmtQty(f.forecast7)} <span className="text-[10px] font-normal text-muted-foreground">units</span>
                        </p>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide",
                            meta.tone,
                          )}
                        >
                          <meta.icon className="size-2.5" />
                          {f.trendPct > 0 ? `+${f.trendPct}%` : `${f.trendPct}%`}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        {/* Pricing recommendations */}
        <section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Lightbulb className="size-5 text-primary" /> Price recommendations
              </h2>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {prices?.note ?? "Compare each listing against the platform average selling price."}
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" asChild>
              <Link to="/farmer/products">
                Adjust prices <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
          {prices === undefined ? (
            <Loading label="Analysing your prices…" />
          ) : priceRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
              List crops first — recommendations appear per active listing.
            </p>
          ) : (
            <ul className="mt-5 grid gap-3 md:grid-cols-2">
              {priceRows.map((p) => {
                const ActionIcon =
                  p.action === "raise"
                    ? TrendingUp
                    : p.action === "cut"
                      ? TrendingDown
                      : Minus;
                return (
                  <li
                    key={p.productId}
                    className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xl">{p.emoji}</span>
                      <span className="text-[15px] font-bold">{p.name}</span>
                      <span
                        className={cn(
                          "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider",
                          PRICE_TONE[p.action],
                        )}
                      >
                        <ActionIcon className="size-3" />
                        {p.action}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-muted/60 px-2 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Your price</p>
                        <p className="font-mono text-[15px] font-bold">{inr(p.unitPrice)}</p>
                        <p className="text-[10px] text-muted-foreground">/ {p.unit}</p>
                      </div>
                      <div className="rounded-lg bg-muted/60 px-2 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Platform avg</p>
                        <p className="font-mono text-[15px] font-bold">
                          {p.avgPrice !== null ? inr(p.avgPrice) : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">/ {p.unit}</p>
                      </div>
                      <div className="rounded-lg bg-primary/5 px-2 py-2 ring-1 ring-primary/20">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Suggested</p>
                        <p className="font-mono text-[15px] font-bold">{inr(p.suggested)}</p>
                        <p className="text-[10px] text-muted-foreground">/ {p.unit}</p>
                      </div>
                    </div>
                    <p className="text-[12.5px] leading-5 text-muted-foreground">{p.reason}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <p className="mt-6 flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary/70" />
          All estimates derive from marketplace order history and listed
          prices. They are guidance, not guarantees — trust local market
          conditions over any single number.
        </p>
      </Container>
    </div>
  );
}
