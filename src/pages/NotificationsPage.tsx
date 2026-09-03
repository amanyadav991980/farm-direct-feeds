import { SiteHeader } from "@/components/site-header";
import { Container, EmptyState, Loading } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { roleHome } from "@/lib/role";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Bell,
  BellRing,
  CheckCheck,
  Inbox,
  Loader2,
  MessageCircle,
  PackageCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";

const KIND_META: Record<
  string,
  { icon: typeof Bell; tone: string; label: string }
> = {
  order_status: { icon: Truck, tone: "text-primary bg-primary/10", label: "Order" },
  order_placed: { icon: ShoppingBag, tone: "text-primary bg-primary/10", label: "Sale" },
  review: { icon: Star, tone: "text-amber-700 bg-amber-100", label: "Review" },
  inquiry: { icon: MessageCircle, tone: "text-sky-900 bg-sky-100", label: "Inquiry" },
  low_stock: { icon: PackageCheck, tone: "text-amber-800 bg-amber-100", label: "Stock" },
  system: { icon: Sparkles, tone: "text-stone-600 bg-stone-100", label: "Platform" },
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated, user } = useAuth();
  const notifications = useQuery(api.notifications.myNotifications, {});
  const markRead = useMutation(api.notifications.markNotificationRead);
  const markAll = useMutation(api.notifications.markAllRead);
  const [busy, setBusy] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <Loading label="Loading notifications…" />
      </div>
    );
  }
  if (!isAuthenticated || !user?.role) {
    return <Navigate to={user?.role ? roleHome(user.role) : "/welcome"} replace />;
  }

  const open = async (n: { id: string; link?: string }) => {
    setBusy(n.id);
    try {
      await markRead({ id: n.id as never });
    } catch {
      /* non-critical */
    }
    setBusy(null);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Container className="py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Inbox
            </p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">Notifications</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Order updates, buyer messages and stock alerts for your workspace.
            </p>
          </div>
          {(notifications ?? []).some((n) => !n.read) && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 self-start sm:self-auto"
              onClick={() => void markAll().catch(() => undefined)}
            >
              <CheckCheck className="size-4" /> Mark all as read
            </Button>
          )}
        </div>

        <div className="mt-7 max-w-3xl">
          {notifications === undefined ? (
            <Loading label="Checking your inbox…" />
          ) : notifications.length === 0 ? (
            <EmptyState
              icon={BellRing}
              title="Nothing here yet"
              body="When your orders move, a farm replies or stock runs low, the update will land here."
              action={
                <Button variant="outline" asChild>
                  <Link to={roleHome(user.role!)}>Back to your dashboard</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-2.5">
              {notifications.map((n) => {
                const meta = KIND_META[n.kind] ?? KIND_META.system;
                return (
                  <li
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3.5 rounded-2xl border bg-card p-4 transition-colors",
                      n.read ? "border-border" : "border-primary/30 bg-primary/[0.03]",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                        meta.tone,
                      )}
                    >
                      <meta.icon className="size-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          {meta.label}
                        </span>
                        {!n.read && (
                          <span className="size-1.5 rounded-full bg-primary" aria-label="Unread" />
                        )}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[15px] font-semibold text-foreground">
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
                        {n.body}
                      </p>
                      {n.link ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="-ml-2 mt-2 h-8 gap-1.5 text-[13px] text-primary hover:bg-primary/10 hover:text-primary"
                          disabled={busy === n.id}
                          onClick={() => void open(n)}
                        >
                          {busy === n.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Bell className="size-3.5" />
                          )}
                          View
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="-ml-2 mt-2 h-8 gap-1.5 text-[13px] text-muted-foreground"
                          disabled={busy === n.id}
                          onClick={() => void open(n)}
                        >
                          {busy === n.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <CheckCheck className="size-3.5" />
                          )}
                          Dismiss
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
          <Inbox className="size-4 text-primary/60" />
          Notifications are stored per account — they are never emails.
        </div>
      </Container>
    </div>
  );
}
