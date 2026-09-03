import { CropArt } from "@/components/crop-art";
import { AvailabilityPill, Stars, Verified } from "@/components/status";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation } from "convex/react";
import { errMsg, fmtQty, inr, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MapPin, Plus, Sprout } from "lucide-react";
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
}: {
  row: ListingRow;
  unit?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline gap-1.5", className)}>
      <span className="font-mono text-lg font-bold tracking-tight text-foreground">
        {inr(row.unitPrice)}
      </span>
      {unit && (
        <span className="font-mono text-[10px] uppercase text-muted-foreground">
          /{row.unit}
        </span>
      )}
      <span className="font-mono text-xs text-muted-foreground line-through">
        {inr(row.marketPrice)}
      </span>
      {row.discountPct > 0 && (
        <span className="ml-0.5 bg-amber-100 px-1 font-mono text-[9px] font-bold text-amber-800">
          {row.discountPct}% OFF
        </span>
      )}
    </div>
  );
}

export function ProductCard({ row, compact }: { row: ListingRow; compact?: boolean }) {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const addToCart = useMutation(api.cart.addToCart);
  const navigate = useNavigate();
  const buyable = row.availability === "available" || row.availability === "limited";

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
      toast.success(`${row.name} added to cart`, {
        description: `${fmtQty(row.minOrderQty)} ${row.unit} at ${inr(row.unitPrice)}/${row.unit}`,
      });
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const fresh = Date.now() - row.harvestDate < 26 * 60 * 60 * 1000;

  return (
    <div className="group flex flex-col overflow-hidden border border-border bg-card transition-colors hover:border-primary/50 hover:bg-card">
      <Link to={`/product/${row.id}`} className="relative block">
        <CropArt
          emoji={row.emoji}
          tint={row.tint}
          name={row.name}
          imageUrl={row.imageUrl}
          className="aspect-[4/3] w-full"
          glyphClassName="text-5xl"
        />
        <div className="absolute left-2 top-2 flex flex-wrap items-center gap-1">
          <AvailabilityPill availability={row.availability} />
          {row.organic && (
            <span className="inline-flex items-center gap-1 border border-emerald-300/60 bg-emerald-100/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-800">
              <Sprout className="size-2.5" /> organic
            </span>
          )}
        </div>
        <div className="absolute right-2 top-2 font-mono text-[9px] uppercase tracking-widest text-black/35 mix-blend-multiply">
          {row.category.slice(0, 3).toUpperCase()} / {row.grade.replace("Grade ", "G")}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={`/product/${row.id}`}
              className="block truncate font-mono text-sm font-bold tracking-tight hover:text-primary"
            >
              {row.emoji} {row.name}
            </Link>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              <Link
                to={`/farmer/${row.farmerId}`}
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <Sprout className="size-3" />
                {row.farmer.name}
              </Link>
              {row.farmer.ratingCount > 0 && (
                <span className="font-mono text-[10px]">
                  ★ {row.farmer.ratingAvg.toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <Verified verified={row.farmer.verified} />
        </div>

        <div className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
          <MapPin className="size-3" />
          {row.farmer.village}, {row.farmer.district}
          {fresh && (
            <span className="ml-auto inline-flex items-center gap-1 text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-600" />
              harvest {timeAgo(row.harvestDate)}
            </span>
          )}
        </div>

        <div className="flex items-end justify-between gap-2 border-t border-dashed border-border pt-2">
          <PriceBlock row={row} />
          <span className="font-mono text-[10px] text-muted-foreground">
            {fmtQty(row.stockQty)} {row.unit} left
          </span>
        </div>

        {!compact && (
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 font-mono text-xs"
              onClick={() => navigate(`/product/${row.id}`)}
            >
              view details
            </Button>
            <Button
              size="sm"
              className="flex-1 gap-1 font-mono text-xs"
              disabled={!buyable || authLoading}
              onClick={handleAdd}
            >
              <Plus className="size-3.5" />
              {buyable ? "add to cart" : row.availability}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
