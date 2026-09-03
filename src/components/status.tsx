import { BadgeCheck, Star, StarHalf } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AVAILABILITY_META,
  ORDER_STATUS_META,
  TONES,
  type Availability,
} from "@/lib/format";

export function TonePill({
  tone,
  children,
  className,
  dot,
}: {
  tone: keyof typeof TONES;
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em]",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="inline-block size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function AvailabilityPill({
  availability,
  className,
}: {
  availability: Availability | string;
  className?: string;
}) {
  const meta =
    AVAILABILITY_META[availability as Availability] ??
    AVAILABILITY_META.out;
  return (
    <TonePill tone={meta.tone} dot className={className}>
      {meta.label}
    </TonePill>
  );
}

export function OrderPill({ status }: { status: string }) {
  const meta = ORDER_STATUS_META[status] ?? {
    label: status.replace(/_/g, " "),
    tone: "muted" as const,
  };
  return (
    <TonePill tone={meta.tone} dot>
      {meta.label.toUpperCase()}
    </TonePill>
  );
}

export function Verified({ verified, muted }: { verified?: boolean; muted?: boolean }) {
  if (!verified) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em]",
        muted ? "text-foreground/50" : "text-emerald-700",
      )}
      title="Verified farmer"
    >
      <BadgeCheck className="size-3.5" />
      verified
    </span>
  );
}

export function Stars({ rating, count }: { rating: number; count?: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.35;
  return (
    <span className="inline-flex items-center gap-1 text-amber-600">
      <span className="inline-flex items-center">
        {Array.from({ length: 5 }).map((_, i) => {
          if (i < full)
            return <Star key={i} className="size-3.5 fill-current" />;
          if (i === full && half)
            return (
              <span key={i} className="relative inline-flex">
                <Star className="size-3.5 text-stone-300" />
                <StarHalf className="absolute inset-0 size-3.5 fill-current" />
              </span>
            );
          return <Star key={i} className="size-3.5 text-stone-300" />;
        })}
      </span>
      <span className="font-mono text-[11px] font-bold text-foreground">
        {rating.toFixed(1)}
      </span>
      {count !== undefined && (
        <span className="font-mono text-[10px] text-muted-foreground">
          ({count})
        </span>
      )}
    </span>
  );
}
