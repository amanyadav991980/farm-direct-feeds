import { SiteHeader } from "@/components/site-header";
import { CropArt } from "@/components/crop-art";
import { ProductCard, type ListingRow } from "@/components/product-card";
import { Container, Eyebrow } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { useEnsureSeeded } from "@/hooks/use-ensure-seeded";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion, type MotionProps } from "framer-motion";
import {
  ArrowRight,
  Banknote,
  BadgeCheck,
  Bot,
  CalendarClock,
  Leaf,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Sprout,
  Star,
  Store,
  Truck,
} from "lucide-react";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_HREF,
} from "@/lib/support";
import { Link, useNavigate } from "react-router";

const CATEGORIES = [
  { name: "Vegetables", emoji: "🥦" },
  { name: "Fruits", emoji: "🥭" },
  { name: "Grains", emoji: "🌾" },
  { name: "Pulses", emoji: "🫘" },
  { name: "Oilseeds", emoji: "🌻" },
  { name: "Other", emoji: "🌶️" },
];

const STEPS = [
  {
    icon: Store,
    title: "Choose from the farm",
    body: "Browse fresh harvests listed by verified farms in your region. Prices are published against the day's market rate — no middlemen, no hidden margins.",
  },
  {
    icon: ShoppingBasket,
    title: "Checkout in minutes",
    body: "Pay by UPI, card or cash on delivery in a demo, end-to-end checkout. Coupons and transparent fees are applied before you confirm.",
  },
  {
    icon: Truck,
    title: "Track it to your door",
    body: "The farmer confirms, packs and dispatches your order. Follow every step from confirmation to delivery with live status updates.",
  },
];

function fadeUp(delay = 0): MotionProps {
  return {
    initial: { opacity: 0, y: 18 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
  };
}

export default function Landing() {
  const navigate = useNavigate();
  useEnsureSeeded();
  const stats = useQuery(api.analytics.publicStats);
  const freshToday = useQuery(api.marketplace.freshToday, { limit: 8 });
  const featured = useQuery(api.farmers.featuredFarmers, { limit: 6 });
  const coupons = useQuery(api.coupons.listPublicCoupons);

  const toAuth = (returnTo: string) =>
    navigate(`/auth?returnTo=${encodeURIComponent(returnTo)}`);

  const heroTiles = (freshToday ?? []).slice(0, 4);
  const farms = featured ?? [];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* ─────────────────────────── HERO ─────────────────────────── */}
      <section className="fd-grid relative overflow-hidden border-b border-border/70">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-accent/50 to-transparent"
          aria-hidden
        />
        <Container className="relative grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <motion.div {...fadeUp(0)}>
              <Eyebrow>Farm-to-doorstep marketplace</Eyebrow>
            </motion.div>
            <motion.h1
              {...fadeUp(0.05)}
              className="mt-4 max-w-xl text-balance text-4xl font-bold leading-[1.08] text-foreground sm:text-5xl lg:text-[3.4rem]"
            >
              Fresh from the farm,{" "}
              <span className="text-primary">straight to your kitchen.</span>
            </motion.h1>
            <motion.p
              {...fadeUp(0.1)}
              className="mt-5 max-w-lg text-[15px] leading-7 text-muted-foreground"
            >
              Farm Direct connects households and businesses directly with
              growers. Order today&apos;s harvest at fair, market-linked prices
              and know exactly which farm grew your food.
            </motion.p>
            <motion.div {...fadeUp(0.15)} className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" className="gap-2 text-[15px]" onClick={() => navigate("/fresh")}>
                <ShoppingBasket className="size-4.5" />
                Shop fresh produce
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-[15px]"
                onClick={() => navigate("/#farmers")}
              >
                Sell your harvest
                <ArrowRight className="size-4" />
              </Button>
            </motion.div>
            <motion.div {...fadeUp(0.2)} className="mt-9 flex flex-wrap gap-x-7 gap-y-3">
              {[
                { icon: BadgeCheck, text: "Verified farms only" },
                { icon: ShieldCheck, text: "Transparent pricing" },
                { icon: Truck, text: "Doorstep delivery" },
              ].map((t) => (
                <span
                  key={t.text}
                  className="inline-flex items-center gap-2 text-[13px] font-medium text-muted-foreground"
                >
                  <t.icon className="size-4 text-primary" />
                  {t.text}
                </span>
              ))}
            </motion.div>
          </div>

          {/* Hero visual — live listings */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {heroTiles.length > 0 ? (
                heroTiles.map((row) => (
                  <Link
                    to={`/product/${row.id}`}
                    key={row.id}
                    className="overflow-hidden rounded-2xl border border-border/70 bg-card transition-transform hover:-translate-y-1"
                  >
                    <CropArt
                      emoji={row.emoji}
                      tint={row.tint}
                      name={row.name}
                      imageUrl={row.imageUrl}
                      className="aspect-[5/4] w-full"
                      glyphClassName="text-6xl"
                    />
                    <div className="flex items-center justify-between px-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{row.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {row.farmer.farmName}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold text-primary">
                        ₹{row.unitPrice}
                        <span className="text-[10px] font-normal text-muted-foreground">
                          /{row.unit}
                        </span>
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex aspect-[5/4] items-center justify-center rounded-2xl border border-border/70 bg-card text-4xl opacity-70"
                  >
                    {["🍅", "🥬", "🥕", "🌾"][i]}
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-border/70 bg-card px-4 py-3">
              <span className="inline-flex items-center gap-2 text-[13px] font-medium">
                <CalendarClock className="size-4 text-primary" />
                Harvested this morning, delivered fresh
              </span>
              <span className="inline-flex items-center gap-1 text-[13px] font-medium text-amber-700">
                <Star className="size-3.5 fill-current" /> 4.8 farm rating
              </span>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* ─────────────────────────── STATS ─────────────────────────── */}
      <section className="border-b border-border/70 bg-card/50">
        <Container className="grid grid-cols-2 gap-px overflow-hidden lg:grid-cols-4">
          {[
            { label: "Partner farms", value: stats ? stats.farmers.toLocaleString("en-IN") : "100+", sub: `${stats?.verifiedFarmers ?? 90}+ verified` },
            { label: "Live listings", value: stats ? stats.products.toLocaleString("en-IN") : "500+", sub: "fresh market lots" },
            { label: "Orders delivered", value: stats ? stats.deliveredOrders.toLocaleString("en-IN") : "2,400+", sub: "across demo orders" },
            { label: "Market value", value: stats ? `₹${(stats.gmv / 1000).toFixed(1)}L` : "₹40L+", sub: "in delivered orders" },
          ].map((s) => (
            <div key={s.label} className="px-5 py-7 text-center lg:text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {s.label}
              </p>
              <p className="mt-1.5 font-mono text-3xl font-bold tracking-tight text-foreground">
                {s.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{s.sub}</p>
            </div>
          ))}
        </Container>
      </section>

      {/* ───────────────────────── CATEGORIES ───────────────────────── */}
      <section className="py-16 sm:py-20">
        <Container>
          <motion.div {...fadeUp(0)} className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Browse by crop</Eyebrow>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">The whole harvest, organised</h2>
            </div>
            <Button variant="ghost" className="gap-1.5 text-sm" onClick={() => navigate("/fresh")}>
              View everything <ArrowRight className="size-4" />
            </Button>
          </motion.div>
          <motion.div
            {...fadeUp(0.05)}
            className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
          >
            {CATEGORIES.map((c) => (
              <Link
                key={c.name}
                to={`/fresh?category=${encodeURIComponent(c.name)}`}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-4 py-6 text-center transition-all hover:-translate-y-1 hover:border-primary/40"
              >
                <span className="text-3xl transition-transform group-hover:scale-110">
                  {c.emoji}
                </span>
                <span className="text-sm font-semibold text-foreground">{c.name}</span>
              </Link>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* ──────────────────────── FRESH TODAY ──────────────────────── */}
      <section className="border-y border-border/70 bg-card/40 py-16 sm:py-20">
        <Container>
          <motion.div {...fadeUp(0)} className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Harvested within 24 hours</Eyebrow>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Fresh today</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Listings whose harvest reached the market today — the shortest
                possible journey from soil to table.
              </p>
            </div>
            <Button variant="outline" className="gap-1.5 text-sm" onClick={() => navigate("/fresh")}>
              Browse the fresh market <ArrowRight className="size-4" />
            </Button>
          </motion.div>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {(freshToday ?? []).map((row: ListingRow) => (
              <ProductCard key={row.id} row={row} />
            ))}
          </div>
        </Container>
      </section>

      {/* ─────────────────────── HOW IT WORKS ──────────────────────── */}
      <section id="how" className="scroll-mt-20 py-16 sm:py-20">
        <Container>
          <motion.div {...fadeUp(0)} className="mx-auto max-w-2xl text-center">
            <Eyebrow className="justify-center">
              <span className="h-px w-6 bg-primary/50" aria-hidden />
              How Farm Direct works
              <span className="h-px w-6 bg-primary/50" aria-hidden />
            </Eyebrow>
            <h2 className="mt-3 text-3xl font-bold">From field to doorstep in three steps</h2>
          </motion.div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div
                key={s.title}
                {...fadeUp(0.08 * i)}
                className="relative rounded-2xl border border-border bg-card p-6"
              >
                <span className="absolute right-5 top-5 font-mono text-3xl font-bold text-border">
                  0{i + 1}
                </span>
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="size-5.5" />
                </span>
                <h3 className="mt-5 text-[17px] font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ─────────────────────── FEATURED FARMS ────────────────────── */}
      <section id="farmers" className="scroll-mt-20 border-t border-border/70 bg-card/40 py-16 sm:py-20">
        <Container>
          <motion.div {...fadeUp(0)} className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Meet the growers</Eyebrow>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Verified farms selling now</h2>
            </div>
          </motion.div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(farms.length > 0 ? farms : []).map((f, i) => (
              <motion.div key={f.id} {...fadeUp(0.05 * i)}>
                <Link
                  to={`/farmer/${f.id}`}
                  className="flex h-full flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-11 items-center justify-center rounded-full bg-accent text-lg">
                        {f.name.charAt(0)}
                      </span>
                      <div>
                        <p className="flex items-center gap-1.5 text-[15px] font-semibold">
                          {f.farmName}
                          {f.verified && <BadgeCheck className="size-4 text-primary" />}
                        </p>
                        <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" />
                          {f.village}, {f.district}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                      <Star className="size-3 fill-current" />
                      {f.ratingCount > 0 ? f.ratingAvg.toFixed(1) : "New"}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-[13px] leading-6 text-muted-foreground">
                    {f.bio || `${f.name} farms ${f.yearsFarming} years of experience.`}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-1.5">
                    <span className="text-sm">{f.topCrops.map((c) => c.emoji).join(" ")}</span>
                    <span className="ml-auto text-xs font-medium text-muted-foreground">
                      {f.productCount} listings
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* ─────────────────────── COUPONS STRIP ─────────────────────── */}
      {!!coupons?.length && (
        <section className="border-t border-border/70 py-10">
          <Container className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              <Leaf className="size-4 text-primary" /> This week&apos;s offers
            </span>
            {coupons.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => toAuth("/fresh")}
                className="rounded-lg border border-dashed border-primary/50 bg-primary/5 px-3 py-1.5 text-left transition-colors hover:bg-primary/10"
                title={c.description}
              >
                <span className="font-mono text-xs font-bold text-primary">{c.code}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {c.type === "percent" ? `${c.value}% off` : `₹${c.value} off`}
                  {c.minOrderValue > 0 && ` above ₹${c.minOrderValue}`}
                </span>
              </button>
            ))}
          </Container>
        </section>
      )}

      {/* ─────────────────── FOR FARMERS + FINAL CTA ────────────────── */}
      <section className="py-16 sm:py-20">
        <Container>
          <motion.div
            {...fadeUp(0)}
            className="fd-grid relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-primary-foreground sm:px-12 lg:py-16"
          >
            <div
              className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/10"
              aria-hidden
            />
            <div className="relative max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">
                Growers &amp; farmer producer organisations
              </p>
              <h2 className="mt-3 text-balance text-3xl font-bold leading-tight sm:text-4xl">
                Sell your harvest at fair, market-linked prices
              </h2>
              <p className="mt-4 text-[15px] leading-7 text-primary-foreground/85">
                List your produce in minutes, publish your own harvest lots,
                manage stock and orders from one dashboard, and reach buyers
                directly — households, retailers and bulk purchasers — without
                a chain of middlemen.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  size="lg"
                  variant="secondary"
                  className="text-[15px]"
                  onClick={() => toAuth("/welcome?role=farmer")}
                >
                  <Sprout className="size-4.5" /> Start selling
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="text-[15px] text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
                  onClick={() => navigate("/fresh")}
                >
                  <Search className="size-4" /> Explore the market first
                </Button>
              </div>
              <div className="mt-9 flex flex-wrap gap-x-8 gap-y-2 text-[13px] text-primary-foreground/80">
                <span className="inline-flex items-center gap-1.5">
                  <Banknote className="size-4" /> Earnings settle per delivered order
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="size-4" /> Plan by harvest &amp; shelf life
                </span>
              </div>
            </div>
          </motion.div>
        </Container>
      </section>

      {/* ─────────────────────────── FOOTER ─────────────────────────── */}
      <footer className="border-t border-border/70 bg-card/60">
        <Container className="py-12">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2 font-bold text-foreground">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Sprout className="size-[18px]" />
                </span>
                Farm Direct
              </div>
              <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
                A farmer-to-buyer agricultural marketplace. Honest prices,
                verified growers and produce that moves from field to doorstep
                in a day.
              </p>
              <p className="mt-4 text-xs text-muted-foreground/80">
                Demo marketplace — all payments, orders and reviews are simulated.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Marketplace
              </p>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <Link to="/fresh" className="text-foreground/80 hover:text-primary">Fresh market</Link>
                <Link to="/auth?returnTo=%2Fbuyer" className="text-foreground/80 hover:text-primary">Buy fresh produce</Link>
                <Link to="/auth?returnTo=%2Fbuyer%2Forders" className="text-foreground/80 hover:text-primary">Track an order</Link>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                For growers
              </p>
              <div className="mt-3 flex flex-col gap-2 text-sm">
                <Link to="/auth?returnTo=%2Fwelcome%3Frole%3Dfarmer" className="text-foreground/80 hover:text-primary">
                  Start selling
                </Link>
                <Link to="/auth?returnTo=%2Ffarmer" className="text-foreground/80 hover:text-primary">
                  Farmer dashboard
                </Link>
              </div>
            </div>
          </div>
          {/* Support band — assistant + direct human contact */}
          <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-2xl border border-primary/25 bg-primary/[0.04] px-6 py-5 lg:flex-row lg:items-center">
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                <Bot className="size-6" />
              </span>
              <div>
                <p className="text-[16px] font-bold">
                  Have a doubt? Ask the assistant — or reach us directly
                </p>
                <p className="mt-1 max-w-xl text-[13px] leading-6 text-muted-foreground">
                  Farmers and buyers can ask any question in Hindi or English.
                  For anything the assistant can&apos;t fix, the Farm Direct team
                  is one call or email away.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" asChild>
                <Link to="/assistant">
                  <Bot className="size-4" /> Ask the AI assistant
                </Link>
              </Button>
              <Button variant="outline" className="gap-2" asChild>
                <a href={`mailto:${SUPPORT_EMAIL}`}>
                  <Mail className="size-4" /> Email support
                </a>
              </Button>
              <Button className="gap-2" asChild>
                <a href={SUPPORT_PHONE_HREF}>
                  <Phone className="size-4" /> Call us
                </a>
              </Button>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-3 border-t border-border/70 pt-6 text-xs text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
            <p>
              © {new Date().getFullYear()} Farm Direct. A full-stack demo of an
              agricultural marketplace.
            </p>
            <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5 text-primary" />
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="text-foreground/80 hover:text-primary"
                >
                  {SUPPORT_EMAIL}
                </a>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Phone className="size-3.5 text-primary" />
                <a
                  href={SUPPORT_PHONE_HREF}
                  className="text-foreground/80 hover:text-primary"
                >
                  {SUPPORT_PHONE_DISPLAY}
                </a>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="size-3.5 text-primary" /> Built on Convex —
                live data, not mock-ups
              </span>
            </p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
