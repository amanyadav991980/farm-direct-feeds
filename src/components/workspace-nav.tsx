import type { LucideIcon } from "lucide-react";
import { NavLink } from "react-router";
import { cn } from "@/lib/utils";

export type WorkspaceTab = {
  to: string;
  label: string;
  icon?: LucideIcon;
  end?: boolean;
};

/** Pill tab strip used across the signed-in workspaces. */
export function WorkspaceNav({
  tabs,
  className,
}: {
  tabs: WorkspaceTab[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Workspace sections"
      className={cn(
        "flex flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card p-1.5",
        className,
      )}
    >
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            cn(
              "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold transition-colors",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )
          }
        >
          {t.icon && <t.icon className="size-4" />}
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

/** Breadcrumb-style helper label above dashboard headings. */
export function Subheader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
      {children}
    </p>
  );
}
