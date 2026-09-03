import { SiteHeader } from "@/components/site-header";
import { CropArt } from "@/components/crop-art";
import { OrderPill } from "@/components/status";
import { Container, Loading } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { errMsg, fmtQty, inr, orderStatusLabel, shortDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Check,
  CheckCheck,
  Clock,
  Loader2,
  MapPin,
  PackageCheck,
  Phone,
  Send,
  Star,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel";

type Order = Doc<"orders">;

type Detail = {
  order: Order;
  farmer: {
    id: string;
    name: string;
    farmName: string;
    village: string;
    district: string;
    state: string;
    verified: boolean;
  } | null;
  perspective: "buyer" | "farmer" | "admin";
};

const PAYMENT_LABEL: Record<string, string> = {
  demo_upi: "UPI (demo)",
  demo_card: "Card (demo)",
  cod: "Cash on delivery",
};

const PAYMENT_STATUS_TONE: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  refunded: "bg-red-100 text-red-800",
};

const STEP_ICON: Record<string, typeof Clock> = {
  placed: Clock,
  confirmed: CheckCheck,
  out_for_delivery: Truck,
  delivered: PackageCheck,
  cancelled: XCircle,
};

export default function OrderDetail() {
  const { orderId } = useParams();
  const data = useQuery(api.orders.orderDetail, { orderId: orderId as never });
  const reviewed = useQuery(api.reviews.reviewedOrders);
  const { user } = useAuth();
  const setStatus = useMutation(api.orders.setOrderStatus);
  const addReview = useMutation(api.reviews.addReview);
  const navigate = useNavigate();

  const [busy, setBusy] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);

  if (data === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <Container>
          <Loading label="Loading order…" />
        </Container>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <Container>
          <p className="py-20 text-center text-muted-foreground">
            This order was not found, or it belongs to a different account.
          </p>
        </Container>
      </div>
    );
  }
  const view = data as unknown as Detail;
  const { order, farmer, perspective } = view;
  const isReviewed = (reviewed ?? []).some((r) => r === order._id);

  const doSetStatus = async (to: string, label: string) => {
    setBusy(to);
    try {
      await setStatus({ orderId: order._id as never, to });
      toast.success(`Order ${order.number} ${label}`);
      setConfirmCancel(false);
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(null);
    }
  };

  const submitReview = async () => {
    if (rating < 1) {
      toast.error("Select a star rating first.");
      return;
    }
    if (comment.trim().length < 4) {
      toast.error("Add a short comment to your review.");
      return;
    }
    setReviewBusy(true);
    try {
      await addReview({
        orderId: order._id as never,
        rating,
        comment: comment.trim(),
      });
      toast.success("Review published — thank you!");
      setRating(0);
      setComment("");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setReviewBusy(false);
    }
  };

  const canAct =
    perspective === "farmer"
      ? order.status === "placed" ||
        order.status === "confirmed" ||
        order.status === "out_for_delivery"
      : perspective === "buyer"
        ? order.status === "placed"
        : order.status === "placed" || order.status === "confirmed";

  const itemUnits = order.items.reduce((s, i) => s + i.qty, 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Container className="py-10">
        <Link
          to={perspective === "farmer" ? "/farmer/orders" : perspective === "admin" ? "/admin" : "/buyer/orders"}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          {perspective === "farmer" ? "Back to farm orders" : perspective === "admin" ? "Back to command centre" : "Back to your orders"}
        </Link>

        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold sm:text-3xl">{order.number}</h1>
              <OrderPill status={order.status} />
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider",
                  PAYMENT_STATUS_TONE[order.paymentStatus] ?? "bg-muted text-muted-foreground",
                )}
              >
                {order.paymentStatus}
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Placed {shortDateTime(order.createdAt)} ·{" "}
              {perspective === "farmer"
                ? `from ${order.buyerName}`
                : perspective === "buyer"
                  ? `from ${farmer?.farmName ?? "the farm"}`
                  : `${order.buyerName} → ${farmer?.farmName ?? "farm"}`}
            </p>
          </div>

          {/* Status actions */}
          {canAct && (
            <div className="flex flex-wrap items-center gap-2">
              {perspective === "farmer" && order.status === "placed" && (
                <Button
                  className="gap-1.5"
                  disabled={busy === "confirmed"}
                  onClick={() => void doSetStatus("confirmed", "confirmed — the buyer has been notified")}
                >
                  {busy === "confirmed" ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  Accept & pack
                </Button>
              )}
              {perspective === "farmer" && order.status === "confirmed" && (
                <Button
                  className="gap-1.5"
                  disabled={busy === "out_for_delivery"}
                  onClick={() => void doSetStatus("out_for_delivery", "is out for delivery")}
                >
                  {busy === "out_for_delivery" ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Truck className="size-4" />
                  )}
                  Dispatch order
                </Button>
              )}
              {perspective === "farmer" && order.status === "out_for_delivery" && (
                <Button
                  className="gap-1.5"
                  disabled={busy === "delivered"}
                  onClick={() => void doSetStatus("delivered", "delivered")}
                >
                  {busy === "delivered" ? <Loader2 className="size-4 animate-spin" /> : <PackageCheck className="size-4" />}
                  Mark delivered
                </Button>
              )}
              {(order.status === "placed" || order.status === "confirmed") &&
                (perspective === "buyer" || perspective === "farmer" || perspective === "admin") && (
                  <Button
                    variant={confirmCancel ? "destructive" : "outline"}
                    className="gap-1.5 text-destructive hover:text-destructive"
                    disabled={busy === "cancelled"}
                    onClick={() => {
                      if (!confirmCancel) {
                        setConfirmCancel(true);
                        return;
                      }
                      void doSetStatus("cancelled", "cancelled — stock has been returned to the listing");
                    }}
                  >
                    {busy === "cancelled" ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <XCircle className="size-4" />
                    )}
                    {confirmCancel ? "Tap again to cancel" : "Cancel order"}
                  </Button>
                )}
            </div>
          )}
        </div>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* Items */}
            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <header className="flex items-center gap-2 border-b border-border px-5 py-3.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <PackageCheck className="size-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-bold">Produce ({itemUnits} units)</p>
                  {farmer && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <BadgeCheck className="size-3 text-primary" /> {farmer.farmName}, {farmer.village}, {farmer.district}
                    </p>
                  )}
                </div>
              </header>
              <ul className="divide-y divide-dashed divide-border">
                {order.items.map((it) => (
                  <li key={it.productId} className="flex items-center gap-4 px-5 py-3.5">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
                      {it.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold">{it.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fmtQty(it.qty)} {it.unit} × {inr(it.unitPrice)}
                        {it.marketPrice > it.unitPrice && (
                          <span className="ml-1.5 line-through">{inr(it.marketPrice)}</span>
                        )}
                      </p>
                    </div>
                    <span className="font-mono text-[15px] font-bold">{inr(it.total)}</span>
                  </li>
                ))}
              </ul>
              <dl className="space-y-1.5 border-t border-border bg-card/60 px-5 py-4 text-[13px] text-muted-foreground">
                <div className="flex justify-between">
                  <dt>Market-rate value</dt>
                  <dd className="font-medium text-foreground/80">{inr(order.marketSubtotal)}</dd>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <dt>Farm-gate discount</dt>
                    <dd className="font-medium text-emerald-700">− {inr(order.discountAmount)}</dd>
                  </div>
                )}
                {order.couponCode && (
                  <div className="flex justify-between">
                    <dt>
                      Coupon <span className="font-mono font-semibold">{order.couponCode}</span>
                    </dt>
                    <dd className="font-medium text-emerald-700">− {inr(order.couponDiscount)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt>Platform fee</dt>
                  <dd className="font-medium text-foreground/80">{inr(order.platformFee)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Delivery</dt>
                  <dd className="font-medium text-foreground/80">{inr(order.deliveryFee)}</dd>
                </div>
                <div className="flex justify-between border-t border-dashed border-border pt-2 text-[14px]">
                  <dt className="font-bold text-foreground">Order total</dt>
                  <dd className="font-mono text-lg font-bold text-foreground">{inr(order.total)}</dd>
                </div>
                {order.paymentRef && (
                  <p className="pt-1 text-[11px]">
                    Demo receipt: <span className="font-mono">{order.paymentRef}</span>
                  </p>
                )}
              </dl>
            </section>

            {/* Timeline */}
            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="text-[15px] font-bold">Order journey</h2>
              <ol className="mt-5 space-y-0">
                {order.timeline.map((t, i) => {
                  const Icon = STEP_ICON[t.status] ?? Clock;
                  const last = i === order.timeline.length - 1;
                  return (
                    <li key={`${t.status}-${t.at}-${i}`} className="relative flex gap-4 pb-6 last:pb-0">
                      {!last && (
                        <span
                          className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-border"
                          aria-hidden
                        />
                      )}
                      <span
                        className={cn(
                          "z-10 flex size-8 shrink-0 items-center justify-center rounded-full border",
                          last
                            ? t.status === "cancelled"
                              ? "border-red-300 bg-red-100 text-red-700"
                              : "border-primary/40 bg-primary text-primary-foreground"
                            : "border-border bg-muted text-muted-foreground",
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 pt-1">
                        <p
                          className={cn(
                            "text-sm font-semibold capitalize",
                            last ? "text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {orderStatusLabel(t.status)}
                          {last && order.status === "delivered" && (
                            <span className="ml-2 text-xs font-medium text-emerald-700">✓ on time</span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{shortDateTime(t.at)}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>

            {/* Reviews */}
            {perspective === "buyer" && order.status === "delivered" && (
              <section className="rounded-2xl border border-border bg-card p-5">
                {isReviewed ? (
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <CheckCheck className="size-5" />
                    </span>
                    <div>
                      <p className="text-[15px] font-bold">You reviewed this order</p>
                      <p className="text-[13px] text-muted-foreground">
                        Thank you — your rating keeps the marketplace honest.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="flex items-center gap-2 text-[15px] font-bold">
                      <Star className="size-4 text-amber-600" /> Rate this farm
                    </h2>
                    <div className="mt-3 flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => {
                        const filled = n <= (hoverRating || rating);
                        return (
                          <button
                            key={n}
                            type="button"
                            aria-label={`${n} star${n > 1 ? "s" : ""}`}
                            onMouseEnter={() => setHoverRating(n)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRating(n)}
                            className="p-0.5"
                          >
                            {filled ? (
                              <Star className="size-7 fill-amber-500 text-amber-500" />
                            ) : (
                              <Star className="size-7 text-stone-300" />
                            )}
                          </button>
                        );
                      })}
                      <span className="ml-2 text-sm font-semibold">
                        {rating > 0 ? ["", "Poor", "Below average", "Good", "Very good", "Excellent"][rating] : "Tap to rate"}
                      </span>
                    </div>
                    <Textarea
                      className="mt-3.5"
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="How was the quality, packing and delivery timing?"
                    />
                    <Button
                      className="mt-3 gap-1.5"
                      disabled={reviewBusy}
                      onClick={() => void submitReview()}
                    >
                      {reviewBusy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                      Publish review
                    </Button>
                  </>
                )}
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            {perspective !== "buyer" && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-[15px] font-bold">Buyer</h2>
                <div className="mt-3 space-y-2.5 text-sm">
                  <p className="flex items-center gap-2">
                    <BadgeCheck className="size-4 shrink-0 text-primary" /> {order.buyerName}
                  </p>
                  {order.buyerPhone && (
                    <p className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="size-4 shrink-0 text-primary" /> {order.buyerPhone}
                    </p>
                  )}
                  <div className="flex items-start gap-2 rounded-xl bg-muted/70 px-3 py-2.5 text-[13px] leading-5 text-muted-foreground">
                    <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>
                      {order.buyerAddress.line}, {order.buyerAddress.city},{" "}
                      {order.buyerAddress.state} — {order.buyerAddress.pincode}
                    </span>
                  </div>
                  {order.buyerNote && (
                    <p className="rounded-xl border border-dashed border-border px-3 py-2.5 text-[13px] italic text-muted-foreground">
                      “{order.buyerNote}”
                    </p>
                  )}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-border bg-card p-5">
              <h2 className="flex items-center gap-2 text-[15px] font-bold">
                <Banknote className="size-4 text-primary" /> Payment
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Method</dt>
                  <dd className="font-semibold">{PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="font-semibold capitalize">{order.paymentStatus}</dd>
                </div>
                {order.paymentRef && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Reference</dt>
                    <dd className="font-mono text-xs">{order.paymentRef}</dd>
                  </div>
                )}
              </dl>
              {order.isDemo && (
                <p className="mt-3 text-[11px] text-muted-foreground">Demo transaction.</p>
              )}
            </section>

            {farmer && (
              <section className="rounded-2xl border border-border bg-card p-5">
                <h2 className="text-[15px] font-bold">Farm</h2>
                <div className="mt-3">
                  <Link
                    to={`/farmer/${farmer.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3 transition-colors hover:border-primary/40"
                  >
                    <span className="flex size-10 items-center justify-center rounded-full bg-accent text-base font-bold text-accent-foreground">
                      {farmer.farmName.charAt(0)}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 truncate text-sm font-bold">
                        {farmer.farmName}
                        {farmer.verified && <BadgeCheck className="size-3.5 shrink-0 text-primary" />}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {farmer.village}, {farmer.district}, {farmer.state}
                      </span>
                    </span>
                  </Link>
                </div>
              </section>
            )}

            <p className="flex items-start gap-2 px-1 text-[11px] leading-5 text-muted-foreground">
              <X className="mt-0.5 size-3.5 shrink-0 text-primary" />
              Demo marketplace — status updates, receipts and refunds are simulated for this prototype.
            </p>
          </aside>
        </div>
      </Container>
    </div>
  );
}
