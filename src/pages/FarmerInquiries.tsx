import { SiteHeader } from "@/components/site-header";
import { WorkspaceNav } from "@/components/workspace-nav";
import { Container, EmptyState, Loading } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { errMsg, shortDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Inbox, Loader2, MessageSquareText, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const FARMER_TABS = [
  { to: "/farmer", label: "Overview", end: true },
  { to: "/farmer/products", label: "Listings" },
  { to: "/farmer/orders", label: "Orders" },
  { to: "/farmer/inquiries", label: "Inquiries" },
  { to: "/farmer/insights", label: "Insights" },
];

export default function FarmerInquiries() {
  const { user } = useAuth();
  const inquiries = useQuery(api.inquiries.farmInquiries);
  const toggleHandled = useMutation(api.inquiries.markInquiryHandled);
  const [busy, setBusy] = useState<string | null>(null);

  if (!user?.role) return null;

  const open = (inquiries ?? []).filter((i) => !i.handled);
  const closed = (inquiries ?? []).filter((i) => i.handled);

  const toggle = async (id: string, handled: boolean) => {
    setBusy(id);
    try {
      await toggleHandled({ id: id as never });
      toast.success(handled ? "Marked as unhandled" : "Nice — follow up with this buyer");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const renderList = (items: typeof inquiries) => {
    const list = items ?? [];
    if (list.length === 0) return null;
    return (
      <ul className="space-y-3">
        {list.map((q) => (
          <li key={q.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="flex size-9 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                {q.buyerName.charAt(0)}
              </span>
              <span className="text-[15px] font-bold">{q.buyerName}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider",
                  q.handled ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800",
                )}
              >
                {q.handled ? "Handled" : "New"}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {shortDateTime(q.createdAt)}
              </span>
            </div>
            <p className="mt-3 rounded-xl bg-muted/50 px-4 py-3 text-sm leading-6 text-foreground/90">
              “{q.message}”
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={q.handled ? "outline" : "default"}
                className="gap-1.5"
                disabled={busy === q.id}
                onClick={() => void toggle(q.id, q.handled)}
              >
                {busy === q.id ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : q.handled ? (
                  <Inbox className="size-3.5" />
                ) : (
                  <CheckCircle2 className="size-3.5" />
                )}
                {q.handled ? "Reopen" : "Mark handled"}
              </Button>
              <p className="text-xs text-muted-foreground">
                {q.handled
                  ? "You've replied — keep the follow-up in this thread."
                  : "Buyers sent this from the marketplace; reply by placing the contact in their order conversation."}
              </p>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Container className="py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Farmer dashboard
            </p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">Buyer inquiries</h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              Bulk requests and product questions arrive here — reply quickly
              and the enquiry becomes an order.
            </p>
          </div>
          <span className="rounded-full border border-amber-300/70 bg-amber-50 px-3 py-1.5 text-[13px] font-semibold text-amber-800">
            {open.length} new · {closed.length} handled
          </span>
        </div>
        <WorkspaceNav tabs={FARMER_TABS} className="mt-6" />

        <div className="mt-7 max-w-3xl space-y-8">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-bold">
              <MessageSquareText className="size-4.5 text-primary" /> Awaiting your reply
            </h2>
            <div className="mt-4">
              {inquiries === undefined ? (
                <Loading label="Loading inquiries…" />
              ) : open.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
                  All caught up — new buyer questions land here instantly.
                </p>
              ) : (
                renderList(open)
              )}
            </div>
          </div>
          {closed.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-[15px] font-bold text-muted-foreground">
                <CheckCircle2 className="size-4.5" /> Handled earlier
              </h2>
              <div className="mt-4">{renderList(closed)}</div>
            </div>
          )}
        </div>

        <p className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
          <Send className="size-4 text-primary/70" />
          Buyer phone numbers are never public — genuine orders carry the
          buyer&apos;s contact for delivery.
        </p>
      </Container>
    </div>
  );
}
