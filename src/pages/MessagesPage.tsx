import { SiteHeader } from "@/components/site-header";
import { WorkspaceNav } from "@/components/workspace-nav";
import { Container, EmptyState, Loading } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { shortDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useQuery } from "convex/react";
import { ArrowRight, MessageCircle, MessageSquareText, Send } from "lucide-react";
import { Link } from "react-router";

const BUYER_TABS = [
  { to: "/buyer", label: "Overview", end: true },
  { to: "/buyer/orders", label: "Orders" },
  { to: "/buyer/messages", label: "Messages" },
];

export default function MessagesPage() {
  const { user } = useAuth();
  const messages = useQuery(api.inquiries.myInquiries);

  if (!user?.role) return null;
  const waiting = (messages ?? []).filter((m) => !m.handled).length;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Container className="py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Buyer dashboard
            </p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">Messages to farms</h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              Questions you send from a listing or farm page land here. Farms
              reply in their own inbox — phone numbers always stay private.
            </p>
          </div>
          {waiting > 0 && (
            <span className="rounded-full border border-amber-300/70 bg-amber-50 px-3 py-1 text-[13px] font-semibold text-amber-800">
              {waiting} awaiting reply
            </span>
          )}
        </div>
        <WorkspaceNav tabs={BUYER_TABS} className="mt-6" />

        <div className="mt-7 max-w-3xl">
          {messages === undefined ? (
            <Loading label="Loading your messages…" />
          ) : messages.length === 0 ? (
            <EmptyState
              icon={MessageSquareText}
              title="No messages yet"
              body="Open any listing or farm page and ask about availability, bulk volumes or delivery schedules — the grower will see it in their Farm Direct inbox."
              action={
                <Button asChild>
                  <Link to="/fresh">
                    Message a farm <ArrowRight className="size-4" />
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {messages.map((m) => (
                <li
                  key={m.id}
                  className="rounded-2xl border border-border bg-card p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="flex size-8 items-center justify-center rounded-full bg-accent text-sm">
                      <Send className="size-3.5 text-primary" />
                    </span>
                    <span className="text-[15px] font-bold">{m.farmer.farmName}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider",
                        m.handled
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800",
                      )}
                    >
                      {m.handled ? "Farm replied" : "Awaiting reply"}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {shortDateTime(m.createdAt)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{m.message}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <p className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
          <MessageCircle className="size-4 text-primary/70" />
          For anything urgent, place an order — the farm confirms every order
          with a call or message.
        </p>
      </Container>
    </div>
  );
}
