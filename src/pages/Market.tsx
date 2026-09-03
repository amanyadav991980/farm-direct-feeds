import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { Container, EmptyState, Loading, PageTitle } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEnsureSeeded } from "@/hooks/use-ensure-seeded";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { ArrowUpDown, Leaf, Search, SearchX, SlidersHorizontal, Store } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { name: "Vegetables", emoji: "🥦" },
  { name: "Fruits", emoji: "🥭" },
  { name: "Grains", emoji: "🌾" },
  { name: "Pulses", emoji: "🫘" },
  { name: "Oilseeds", emoji: "🌻" },
  { name: "Other", emoji: "🌶️" },
];

export type SortKey = "fresh" | "price_asc" | "price_desc" | "rating";

export default function Market() {
  useEnsureSeeded();
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get("category") ?? undefined;
  const qUrl = searchParams.get("q") ?? "";
  const [q, setQ] = useState(qUrl);
  const [debouncedQ, setDebouncedQ] = useState(qUrl);
  const [organic, setOrganic] = useState(false);
  const [available, setAvailable] = useState(false);
  const [verified, setVerified] = useState(false);
  const [sort, setSort] = useState<SortKey>("fresh");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (debouncedQ) params.set("q", debouncedQ);
    else params.delete("q");
    setSearchParams(params, { replace: true });
  }, [debouncedQ]); // eslint-disable-line react-hooks/exhaustive-deps

  const data = useQuery(api.marketplace.browse, {
    category,
    search: debouncedQ || undefined,
    organicOnly: organic || undefined,
    onlyAvailable: available || undefined,
    verifiedOnly: verified || undefined,
  });

  const rows = useMemo(() => {
    const list = [...(data?.rows ?? [])];
    switch (sort) {
      case "price_asc":
        list.sort((a, b) => a.unitPrice - b.unitPrice);
        break;
      case "price_desc":
        list.sort((a, b) => b.unitPrice - a.unitPrice);
        break;
      case "rating":
        list.sort(
          (a, b) =>
            b.farmer.ratingAvg * Math.min(b.farmer.ratingCount, 10) -
            a.farmer.ratingAvg * Math.min(a.farmer.ratingCount, 10),
        );
        break;
      default:
        list.sort((a, b) => b.createdAt - a.createdAt);
    }
    return list;
  }, [data?.rows, sort]);

  const hasFilters = !!(category || debouncedQ || organic || available || verified);

  const toggle = (setter: (v: boolean) => void, value: boolean) => () => setter(!value);

  const filterChip = (
    active: boolean,
    label: string,
    onClick: () => void,
    icon?: ReactNode,
  ) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="border-b border-border/70 bg-card/50">
        <Container className="py-10 sm:py-12">
          <PageTitle
            eyebrow="The fresh market"
            title="Farm-fresh produce, today"
            description="Search live listings from verified farms. Every price is published against the day's market rate with transparent discounts."
          />
          <div className="relative mt-6 max-w-xl">
            <Search className="absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tomatoes, dal, organic vegetables…"
              className="h-12 rounded-full pl-11 text-[15px]"
            />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <SlidersHorizontal className="size-3.5" /> Filters
            </span>
            {filterChip(!!category, category ?? "All categories", () => {
              const p = new URLSearchParams(searchParams);
              p.delete("category");
              setSearchParams(p, { replace: true });
            })}
            {CATEGORIES.map((c) =>
              filterChip(category === c.name, c.name, () => {
                const p = new URLSearchParams(searchParams);
                p.set("category", c.name);
                setSearchParams(p, { replace: true });
              }),
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {filterChip(organic, "Organic only", toggle(setOrganic, organic), <Leaf className="size-3.5" />)}
            {filterChip(available, "In stock", toggle(setAvailable, available))}
            {filterChip(verified, "Verified farms", toggle(setVerified, verified))}
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:inline-flex">
                <ArrowUpDown className="size-3.5" /> Sort
              </span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="h-9 rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground outline-none"
                aria-label="Sort listings"
              >
                <option value="fresh">Newest harvest</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="rating">Top rated farms</option>
              </select>
            </div>
          </div>
        </Container>
      </section>

      <Container className="py-10">
        {data === undefined ? (
          <Loading label="Loading the market…" />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={hasFilters ? "Nothing matches those filters" : "The market opens soon"}
            body={
              hasFilters
                ? "Try a different search term or clear some filters — new harvests are listed every day."
                : "Fresh listings from verified farms will appear here. Check back shortly."
            }
            action={
              hasFilters ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQ("");
                    setDebouncedQ("");
                    setOrganic(false);
                    setAvailable(false);
                    setVerified(false);
                    setSearchParams({}, { replace: true });
                  }}
                >
                  Clear all filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 pb-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-mono font-semibold text-foreground">{rows.length}</span>{" "}
                {rows.length === 1 ? "listing" : "listings"}
                {data?.settings?.marketSourceLabel && (
                  <span className="ml-2 hidden text-xs sm:inline">
                    · {data.settings.marketSourceLabel}
                  </span>
                )}
              </p>
            </div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4"
            >
              {rows.map((row) => (
                <ProductCard key={row.id} row={row} />
              ))}
            </motion.div>
          </>
        )}

        <div className="mt-12 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 px-6 py-10 text-center">
          <span className="flex size-11 items-center justify-center rounded-full bg-accent text-primary">
            <Store className="size-5" />
          </span>
          <h3 className="text-[15px] font-semibold">A grower with a fresh harvest?</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            List your produce in under a minute and reach buyers across the
            region with transparent market-linked pricing.
          </p>
          <Link to="/#farmers">
            <Button variant="outline" className="mt-1">
              Learn about selling on Farm Direct
            </Button>
          </Link>
        </div>
      </Container>
    </div>
  );
}
