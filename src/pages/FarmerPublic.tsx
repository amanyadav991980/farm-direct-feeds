import { SiteHeader } from "@/components/site-header";
import { ProductCard, type ListingRow } from "@/components/product-card";
import { Stars, Verified } from "@/components/status";
import { Container, Loading } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { errMsg, inr, shortDate } from "@/lib/format";
import {
  BadgeCheck,
  CalendarDays,
  Leaf,
  Loader2,
  MapPin,
  MessageSquareText,
  Package,
  Send,
  Sprout,
  TrendingUp,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

export default function FarmerPublic() {
  const { farmerId } = useParams();
  const data = useQuery(api.farmers.publicFarmer, { farmerId: farmerId as never });
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const sendInquiry = useMutation(api.inquiries.sendInquiry);
  const navigate = useNavigate();
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const farmer = data?.farmer;
  const products = (data?.products ?? []) as unknown as ListingRow[];
  const reviews = data?.reviews ?? [];
  const stats = data?.stats;

  const submitMessage = async () => {
    if (!isAuthenticated) {
      navigate(`/auth?returnTo=${encodeURIComponent(`/farmer/${farmerId}`)}`);
      return;
    }
    setSending(true);
    try {
      await sendInquiry({ farmerId: farmerId as never, message: note });
      toast.success("Message sent", {
        description: `${farmer?.farmName} will see your message in their inbox.`,
      });
      setNote("");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      {!data ? (
        <Container>
          <Loading label="Loading farm…" />
        </Container>
      ) : !farmer ? (
        <Container>
          <p className="py-20 text-center text-muted-foreground">This farm profile was not found.</p>
        </Container>
      ) : (
        <Container className="py-8 sm:py-10">
          <nav className="mb-6 flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <Link to="/fresh" className="hover:text-foreground">Fresh market</Link>
            <span aria-hidden>/</span>
            <span className="font-medium text-foreground">{farmer.farmName}</span>
          </nav>

          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <div>
              <div className="flex flex-wrap items-start gap-4">
                <span className="flex size-16 items-center justify-center rounded-2xl bg-accent text-2xl font-bold text-accent-foreground">
                  {farmer.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl font-bold sm:text-3xl">{farmer.farmName}</h1>
                    <Verified verified={farmer.verified} />
                    {farmer.ratingCount > 0 && <Stars rating={farmer.ratingAvg} count={farmer.ratingCount} />}
                  </div>
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-4 text-primary" />
                    {farmer.village}, {farmer.district}, {farmer.state}
                    <span className="ml-3 inline-flex items-center gap-1.5">
                      <Sprout className="size-4 text-primary" /> Farming for {farmer.yearsFarming} years
                    </span>
                  </p>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <Button variant="outline" className="gap-2" onClick={() => navigate("/fresh")}>
                    <Truck className="size-4" /> Order from this farm
                  </Button>
                </div>
              </div>

              {farmer.bio && (
                <p className="mt-5 max-w-3xl text-[15px] leading-7 text-muted-foreground">{farmer.bio}</p>
              )}

              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { icon: Package, label: "Live listings", value: String(stats?.productCount ?? 0) },
                  { icon: TrendingUp, label: "Units sold", value: String(stats?.soldQty ?? 0) },
                  { icon: Truck, label: "Delivered orders", value: String(stats?.deliveredCount ?? 0) },
                  { icon: Leaf, label: "Farm-gate value", value: inr(stats?.grossSales ?? 0) },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-border bg-card px-4 py-4">
                    <s.icon className="size-4 text-primary" />
                    <p className="mt-2 font-mono text-xl font-bold">{s.value}</p>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              <h2 className="mt-10 text-xl font-bold">Currently selling</h2>
              {products.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">
                  No live listings right now — the next harvest is on its way.
                </p>
              ) : (
                <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
                  {products.map((row) => (
                    <ProductCard key={row.id} row={row} />
                  ))}
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <Card className="p-5">
                <h3 className="flex items-center gap-2 text-[15px] font-semibold">
                  <MessageSquareText className="size-4.5 text-primary" /> Message this farm
                </h3>
                <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
                  Bulk orders, delivery scheduling or product questions — the
                  grower replies in their Farm Direct inbox.
                </p>
                <div className="mt-4 space-y-3">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={`Ask about availability, volumes or delivery…`}
                    rows={4}
                  />
                  <Button
                    className="w-full gap-1.5"
                    disabled={sending || (isAuthenticated && note.trim().length < 10) || (!isAuthenticated && !authLoading)}
                    onClick={submitMessage}
                  >
                    {sending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : isAuthenticated ? (
                      <Send className="size-4" />
                    ) : (
                      <BadgeCheck className="size-4" />
                    )}
                    {isAuthenticated ? "Send message" : "Sign in to message"}
                  </Button>
                </div>
              </Card>

              <Card className="p-5">
                <h3 className="text-[15px] font-semibold">What buyers say</h3>
                <div className="mt-4 space-y-4">
                  {reviews.length === 0 ? (
                    <p className="text-[13px] text-muted-foreground">
                      No reviews yet — the first delivered orders unlock ratings.
                    </p>
                  ) : (
                    reviews.slice(0, 3).map((r) => (
                      <div key={r.id} className="border-t border-dashed border-border pt-3 first:border-0 first:pt-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[13px] font-semibold">{r.reviewerName}</span>
                          <span className="text-[11px] text-muted-foreground">{shortDate(r.createdAt)}</span>
                        </div>
                        <div className="mt-1">
                          <Stars rating={r.rating} />
                        </div>
                        <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">{r.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <p className="flex items-start gap-2 px-1 text-xs leading-5 text-muted-foreground">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" />
                Growing with Farm Direct since {shortDate(farmer.createdAt)}.
              </p>
            </aside>
          </div>
        </Container>
      )}
    </div>
  );
}
