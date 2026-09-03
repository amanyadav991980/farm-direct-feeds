import { useState } from "react";
import { cn } from "@/lib/utils";
import { TINTS } from "@/lib/format";
import { cropImage } from "@/lib/crop-images";

/**
 * Product/crop visual. Real produce photography is preferred: a listing's own
 * upload (imageUrl) wins, then the curated catalogue photo for the crop name
 * (see lib/crop-images). If neither is available or a photo fails to load,
 * the tile falls back to a soft tinted plate with a delicate plot-grid.
 */
export function CropArt({
  emoji,
  tint,
  name,
  imageUrl,
  className,
  glyphClassName,
}: {
  emoji: string;
  tint: number;
  name: string;
  imageUrl?: string | null;
  className?: string;
  glyphClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const t = TINTS[Math.abs(tint ?? 0) % TINTS.length];
  const photo = imageUrl ?? cropImage(name) ?? "";

  if (photo && !failed) {
    return (
      <div className={cn("relative overflow-hidden bg-muted", className)}>
        <img
          src={photo}
          alt={name}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn("relative overflow-hidden fd-grid", className)}
      style={{ backgroundColor: t.bg }}
      aria-label={name}
    >
      <div
        className="pointer-events-none absolute right-2 top-2 rounded-sm px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.16em]"
        style={{
          color: "rgba(35,38,31,0.6)",
          border: `1px solid ${t.border}`,
          backgroundColor: "rgba(255,255,255,0.55)",
        }}
      >
        {name.slice(0, 16)}
      </div>
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          glyphClassName,
        )}
      >
        <span className="select-none leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.75)]">
          {emoji}
        </span>
      </div>
    </div>
  );
}
