import { CropArt } from "@/components/crop-art";
import { AvailabilityPill, Stars, Verified } from "@/components/status";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { errMsg, fmtQty, inr, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Leaf, MapPin, Plus, Sprout } from "lucide-react";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router";

export type ListingRow = {
  id: string;
  farmerId: string;
  farmer: {
    id: string;
    name: string;
    farmName: string;
    village: string;
    district: string;
    state: string;
    verified: boolean;
    ratingAvg: number;
    ratingCount: number;
  };
  name: string;
  emoji: string;
  tint: number;
  category: string;
  subcategory: string;
  unit: string;
  grade: string;
  organic: boolean;
  imageUrl?: string;
  marketPrice: number;
  unitPrice: number;
  discountPct: number;
  stockQty: number;
  minOrderQty: number;
  harvestDate: number;
  shelfLifeDays: number;
  soldQty: number;
  availability: "available" | "limited" | "upcoming" | "out" | "inactive";
  createdAt: number;
};

export function PriceBlock({
  row,
  unit = true,
  className,
  showMarket = true,
}: {
  row: ListingRow;
  unit?: boolean;
  className?: string;
  showMarket?: boolean;
}) {
  return (
    <div className={cn("flex items-baseline gap-1.5", className)}>
      <span className="font-mono text-lg font-bold tracking-tight text-foreground">
        {inr(row.unitPrice)}
      </span>
      {unit && (
        <span className="font-mono text-[11px] text-muted-foreground">
          / {row.unit}
        </span>
      )}
      {showMarket && row.discountPct > 0 && (
        <>
          <span className="font-mono text-xs text-muted-foreground line-through">
            {inr(row.marketPrice)}
          </span>
          <span className="rounded-sm bg-emerald-100 px-1 py-px font-mono text-[10px] font-semibold text-emerald-800">
            {row.discountPct}% off
          </span>
        </>
      )}
    </div>
  );
}

export function ProductCard({
  row,
  compact,
}: {
  row: ListingRow;
  compact?: boolean;
}) {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const addToCart = useMutation(api.cart.addToCart);
  const navigate = useNavigate();
  const buyable =
    row.availability === "available" || row.availability === "limited";

  const handleAdd = async () => {
    if (!isAuthenticated) {
      navigate(`/auth?returnTo=${encodeURIComponent(`/product/${row.id}`)}`);
      return;
    }
    if (!user?.role) {
      navigate(`/welcome?returnTo=${encodeURIComponent(`/product/${row.id}`)}`);
      return;
    }
    try {
      await addToCart({ productId: row.id as never, quantity: row.minOrderQty || 1 });
      toast.success(`${row.name} added to your basket`, {
        description: `${fmtQty(row.minOrderQty)} ${row.unit} at ${inr(row.unitPrice)}/${row.unit}`,
      });
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const fresh = Date.now() - row.harvestDate < 26 * 60 * 60 * 1000;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40">
      <Link to={`/product/${row.id}`} className="relative block">
        <CropArt
          emoji={row.emoji}
          tint={row.tint}
          name={row.name}
          imageUrl={row.imageUrl}
          className="aspect-[4/3] w-full"
          glyphClassName="text-5xl"
        />
        <div className="absolute left-2.5 top-2.5 flex flex-wrap items-center gap-1.5">
          <AvailabilityPill availability={row.availability} />
          {row.organic && (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-white/90 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-emerald-800 backdrop-blur">
              <Leaf className="size-2.5" /> organic
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={`/product/${row.id}`}
              className="block truncate text-[15px] font-semibold text-foreground hover:text-primary"
            >
              {row.name}
            </Link>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-muted-foreground">
              <Link
                to={`/farmer/${row.farmerId}`}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <Sprout className="size-3 text-primary/70" />
                <span className="font-medium">{row.farmer.farmName}</span>
              </Link>
              {row.farmer.ratingCount > 0 && (
                <span className="text-amber-600">
                  <Stars rating={row.farmer.ratingAvg} />
                </span>
              )}
            </div>
          </div>
          <Verified verified={row.farmer.verified} />
        </div>

        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="size-3" />
          {row.farmer.village}, {row.farmer.district}
          {fresh && (
            <span className="ml-auto inline-flex items-center gap-1 font-medium text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-600" />
              harvested {timeAgo(row.harvestDate)}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 border-t border-dashed border-border pt-2.5">
          <PriceBlock row={row} />
          <span className="text-[11px] text-muted-foreground">
            {fmtQty(row.stockQty)} {row.unit} available
          </span>
        </div>

        {!compact && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-[13px]"
              onClick={() => navigate(`/product/${row.id}`)}
            >
              Details
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-1.5 text-[13px]"
              disabled={!buyable || authLoading}
              onClick={handleAdd}
            >
              <Plus className="size-4" />
              {buyable ? "Add to basket" : "Unavailable"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
