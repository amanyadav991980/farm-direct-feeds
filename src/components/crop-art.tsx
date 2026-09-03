import { useState } from "react";
import { cn } from "@/lib/utils";
import { TINTS } from "@/lib/format";

/**
 * Product/crop visual. Every crop in the catalogue renders its own plate: a
 * tinted terminal-grid panel with the crop glyph. When a real photo is
 * attached (imageUrl) the tile upgrades to the photo and falls back to the
 * plate if it ever fails to load.
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

  if (imageUrl && !failed) {
    return (
      <div className={cn("relative overflow-hidden", className)}>
        <img
          src={imageUrl}
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
      className={cn(
        "relative overflow-hidden fd-grid",
        className,
      )}
      style={{ backgroundColor: t.bg }}
      aria-label={name}
    >
      <div className="fd-scan absolute inset-0" />
      <div
        className="absolute right-1.5 top-1.5 select-none font-mono text-[9px] uppercase tracking-[0.18em]"
        style={{ color: "rgba(35,38,31,0.55)", border: `1px solid ${t.border}` }}
      >
        &nbsp;{name.slice(0, 14)}&nbsp;
      </div>
      <div className="absolute bottom-1.5 left-2 select-none font-mono text-[9px] tracking-[0.2em] text-black/25">
        ▚▚ crop-{Math.abs(tint) % 16}
      </div>
      <div
        className={cn(
          "absolute inset-0 flex items-center justify-center",
          glyphClassName,
        )}
      >
        <span className="select-none leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.7)]">
          {emoji}
        </span>
      </div>
    </div>
  );
}
