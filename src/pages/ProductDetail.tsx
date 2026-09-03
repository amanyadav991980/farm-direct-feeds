import { SiteHeader } from "@/components/site-header";
import { CropArt } from "@/components/crop-art";
import { ProductCard, PriceBlock, type ListingRow } from "@/components/product-card";
import { AvailabilityPill, Stars } from "@/components/status";
import { Container, Loading } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { errMsg, fmtQty, inr, shortDate } from "@/lib/format";
import {
  BadgeCheck,
  CalendarDays,
  Heart,
  Leaf,
  Loader2,
  MapPin,
  MessageCircleQuestion,
  Minus,
  PackageCheck,
  Plus,
  Send,
  ShieldCheck,
  ShoppingBasket,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

type DetailView = {
  listing: ListingRow;
  description: string;
  reviewsSummary: { ratingAvg: number; count: number };
  related: ListingRow[];
};

export default function ProductDetail() {
  const { id } = useParams();
  const detail = useQuery(api.marketplace.productDetail, { productId: id as never });

  if (!detail) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <Container>
          <Loading label="Loading listing…" />
        </Container>
      </div>
    );
  }
  const view: DetailView = detail as unknown as DetailView;
  return <ProductBody productId={id as string} view={view} />;
}

function ProductBody({ productId, view }: { productId: string; view: DetailView }) {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const row = view.listing;
  const reviews = useQuery(api.reviews.reviewsByFarmer, {
    farmerId: row.farmerId as never,
  });
  const saved = useQuery(api.products.isWishlisted, { productId: productId as never });
  const addToCart = useMutation(api.cart.addToCart);
  const toggleSave = useMutation(api.products.toggleWishlist);
  const sendInquiry = useMutation(api.inquiries.sendInquiry);

  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  const buyable = row.availability === "available" || row.availability === "limited";
  const maxQty = Math.max(1, Math.floor(row.stockQty));

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
      await addToCart({ productId: row.id as never, quantity: qty });
      toast.success("Added to your basket", {
        description: `${fmtQty(qty)} ${row.unit} of ${row.name}`,
      });
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated) {
      navigate(`/auth?returnTo=${encodeURIComponent(`/product/${row.id}`)}`);
      return;
    }
    try {
      const res = await toggleSave({ productId: row.id as never });
      toast.success(res.saved ? "Saved for later" : "Removed from your saved crops");
    } catch (e) {
      toast.error(errMsg(e));
    }
  };

  const handleAsk = async () => {
    if (!isAuthenticated) {
      navigate(`/auth?returnTo=${encodeURIComponent(`/product/${row.id}`)}`);
      return;
    }
    setSending(true);
    try {
      await sendInquiry({
        farmerId: row.farmerId as never,
        productId: row.id as never,
        message: note,
      });
      toast.success("Message sent to the farm", {
        description: `${row.farmer.farmName} will see it in their inbox.`,
      });
      setNote("");
      setAskOpen(false);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Container className="py-8 sm:py-12">
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
          <Link to="/fresh" className="hover:text-foreground">Fresh market</Link>
          <span aria-hidden>/</span>
          <Link to={`/fresh?category=${encodeURIComponent(row.category)}`} className="hover:text-foreground">
            {row.category}
          </Link>
          <span aria-hidden>/</span>
          <span className="font-medium text-foreground">{row.name}</span>
        </nav>

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          <div>
            <CropArt
              emoji={row.emoji}
              tint={row.tint}
              name={row.name}
              imageUrl={row.imageUrl}
              className="aspect-[4/3] w-full rounded-2xl border border-border/70"
              glyphClassName="text-[7rem]"
            />
            <div className="mt-6 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-lg text-accent-foreground">
                    {row.farmer.name.charAt(0)}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[15px] font-semibold">
                      <Link to={`/farmer/${row.farmerId}`} className="truncate hover:text-primary">
                        {row.farmer.farmName}
                      </Link>
                      {row.farmer.verified && <BadgeCheck className="size-4 shrink-0 text-primary" />}
                    </p>
                    <p className="inline-flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      {row.farmer.village}, {row.farmer.district}, {row.farmer.state}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" asChild className="shrink-0">
                  <Link to={`/farmer/${row.farmerId}`}>View farm</Link>
                </Button>
              </div>
              {row.farmer.ratingCount > 0 && (
                <div className="mt-3 border-t border-dashed border-border pt-3">
                  <Stars rating={row.farmer.ratingAvg} count={row.farmer.ratingCount} />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <AvailabilityPill availability={row.availability} />
              {row.organic && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                  <Leaf className="size-3" /> Organically grown
                </span>
              )}
              <span className="rounded-full border border-border bg-muted px-2.5 py-1 font-mono text-[11px] text-muted-foreground">
                {row.grade}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{row.name}</h1>
            <p className="mt-2 text-[15px] leading-7 text-muted-foreground">
              {view.description ||
                `${row.name} from ${row.farmer.farmName}, harvested and packed fresh at the farm gate.`}
            </p>

            <div className="mt-6 rounded-2xl border border-border bg-card p-5">
              <PriceBlock row={row} className="[&_span:first-child]:text-3xl" />
              <p className="mt-1 text-xs text-muted-foreground">
                Reference market price {inr(row.marketPrice)}/{row.unit} · you save{" "}
                {inr(row.marketPrice - row.unitPrice)}/{row.unit}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <PackageCheck className="size-4 text-primary" /> {fmtQty(row.stockQty)} {row.unit} in stock
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4 text-primary" /> Harvested {shortDate(row.harvestDate)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Truck className="size-4 text-primary" /> Shelf life ~{row.shelfLifeDays} days
              </span>
            </div>

            {buyable && (
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="flex h-11 items-center rounded-xl border border-border bg-card">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    className="flex size-11 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                    onClick={() => setQty((v) => Math.max(1, v - 1))}
                    disabled={qty <= 1}
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-12 text-center font-mono text-[15px] font-bold">{qty}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    className="flex size-11 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
                    onClick={() => setQty((v) => Math.min(maxQty, v + 1))}
                    disabled={qty >= maxQty}
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                <span className="max-w-44 text-xs text-muted-foreground">
                  {row.minOrderQty > 1
                    ? `Sold in lots from ${fmtQty(row.minOrderQty)} ${row.unit}`
                    : "Sold per unit with doorstep delivery"}
                </span>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
              <Button
                size="lg"
                className="flex-1 gap-2 text-[15px]"
                disabled={!buyable || authLoading}
                onClick={handleAdd}
              >
                <ShoppingBasket className="size-5" />
                {buyable ? "Add to basket" : "Currently unavailable"}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="gap-2 text-[15px]"
                onClick={handleSave}
                disabled={authLoading}
              >
                <Heart className={`size-5 ${saved ? "fill-current text-primary" : ""}`} />
                {saved ? "Saved" : "Save for later"}
              </Button>
            </div>

            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-accent/60 px-4 py-3 text-[13px] leading-6 text-accent-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              <p>
                Orders are confirmed by the farm before dispatch and tracked to
                your door. Payments here are a full demo — no real money moves.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-2">
          <section>
            <h2 className="text-xl font-bold">Ask this farm</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Questions about quantity, quality or availability go straight to
              the grower&apos;s Farm Direct inbox — phone numbers stay private.
            </p>
            <Card className="mt-4 p-4">
              {askOpen ? (
                <div className="space-y-3">
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={`e.g. Can you supply ${fmtQty(Math.max(row.minOrderQty * 10, 10))} ${row.unit} weekly for a restaurant order?`}
                    rows={3}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      className="gap-1.5"
                      disabled={sending || note.trim().length < 10}
                      onClick={handleAsk}
                    >
                      {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      Send message
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setAskOpen(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="outline" className="gap-2" onClick={() => setAskOpen(true)}>
                  <MessageCircleQuestion className="size-4" /> Message the farm
                </Button>
              )}
            </Card>
          </section>

          <section>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-bold">Buyer reviews</h2>
              {view.reviewsSummary.count > 0 && (
                <Stars rating={view.reviewsSummary.ratingAvg} count={view.reviewsSummary.count} />
              )}
            </div>
            <div className="mt-4 space-y-3">
              {(reviews ?? []).length === 0 ? (
                <p className="rounded-xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
                  No reviews yet — customers can review this farm once an order
                  is delivered.
                </p>
              ) : (
                (reviews ?? []).slice(0, 6).map((r) => (
                  <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{r.reviewerName}</span>
                      <span className="text-xs text-muted-foreground">{shortDate(r.createdAt)}</span>
                    </div>
                    <div className="mt-1.5">
                      <Stars rating={r.rating} />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{r.comment}</p>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {view.related.length > 0 && (
          <section className="mt-14">
            <h2 className="text-xl font-bold">More from the market</h2>
            <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
              {view.related.map((r) => (
                <ProductCard key={r.id} row={r} compact />
              ))}
            </div>
          </section>
        )}
      </Container>
    </div>
  );
}
