import { SiteHeader } from "@/components/site-header";
import { CropArt } from "@/components/crop-art";
import { Container, EmptyState, Loading } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { errMsg, fmtQty, inr } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Percent,
  ShoppingBasket,
  TicketPercent,
  Truck,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

type QuoteLine = {
  productId: string;
  name: string;
  emoji: string;
  unit: string;
  qty: number;
  marketPrice: number;
  unitPrice: number;
  total: number;
  stockQty: number;
  category: string;
};

type QuoteGroup = {
  farmerId: string;
  farmerName: string;
  farmerLocation: string;
  lines: QuoteLine[];
  marketSubtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  platformFee: number;
  deliveryFee: number;
  couponDiscount: number;
  total: number;
};

type QuoteView = {
  groups: QuoteGroup[];
  itemCount: number;
  marketSubtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  platformFee: number;
  deliveryFee: number;
  couponDiscount: number;
  total: number;
  coupon: { code: string; title: string } | null;
  couponError?: string;
};

const PAYMENT_METHODS = [
  {
    id: "demo_upi",
    icon: Banknote,
    label: "UPI",
    sub: "GPay, PhonePe, Paytm — instant demo approval",
  },
  {
    id: "demo_card",
    icon: CreditCard,
    label: "Card",
    sub: "Credit or debit card — demo gateway",
  },
  {
    id: "cod",
    icon: Truck,
    label: "Cash on delivery",
    sub: "Pay the driver when the produce arrives",
  },
] as const;

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cart = useQuery(api.cart.myCart);
  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<string | undefined>(undefined);
  const [payment, setPayment] = useState<(typeof PAYMENT_METHODS)[number]["id"]>("demo_upi");
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [line, setLine] = useState(user?.addressLine ?? "");
  const [city, setCity] = useState(user?.city ?? "");
  const [state, setState] = useState(user?.state ?? "");
  const [pincode, setPincode] = useState(user?.pincode ?? "");
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);

  const quoteRaw = useQuery(api.orders.quoteOrder, {
    couponCode: applied,
  });
  const quote = (quoteRaw ?? null) as QuoteView | null;
  const placeOrders = useMutation(api.orders.placeOrders);
  const [couponError, setCouponError] = useState<string | null>(null);

  if (!user?.role) return null;
  const cartCount = (cart ?? []).reduce((s, l) => s + l.quantity, 0);

  const applyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    if (quote?.couponError) setCouponError(null);
    setApplied(code);
  };

  const place = async () => {
    setCouponError(null);
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Enter the receiver's full name.");
      return;
    }
    if (!phone.trim() || !/^[0-9+\s-]{10,15}$/.test(phone.trim())) {
      toast.error("Enter a reachable contact phone number.");
      return;
    }
    if (!line.trim() || !city.trim() || !state || !/^\d{4,6}$/.test(pincode.trim())) {
      toast.error("Complete the delivery address with a valid pincode.");
      return;
    }
    setPlacing(true);
    try {
      const res = await placeOrders({
        address: {
          line: line.trim(),
          city: city.trim(),
          state,
          pincode: pincode.trim(),
        },
        phone: phone.trim(),
        paymentMethod: payment,
        couponCode: applied,
        buyerNote: note.trim() || undefined,
      });
      navigate("/buyer/orders", {
        state: {
          placed: {
            numbers: res.numbers,
            total: res.total,
            payment,
          },
        },
      });
    } catch (e) {
      toast.error(errMsg(e));
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Container className="py-10">
        <Link
          to="/cart"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to basket
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Secure checkout
            </p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">Confirm your order</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              A mixed basket becomes one order per farm — each farm confirms and
              dispatches its own delivery.
            </p>
          </div>
        </div>

        {cart === undefined ? (
          <Loading label="Preparing checkout…" className="py-24" />
        ) : cartCount === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={ShoppingBasket}
              title="Nothing to check out"
              body="Your basket is empty — add a few fresh harvests before returning."
              action={
                <Button asChild>
                  <Link to="/fresh">Browse fresh produce</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            {/* Left: form */}
            <div className="space-y-6">
              <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-[15px] font-bold">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
                  Delivery address
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="c-name">Receiver name</Label>
                    <Input id="c-name" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="c-phone">Phone</Label>
                    <Input id="c-phone" className="mt-1.5" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="c-line">Address</Label>
                    <Input id="c-line" className="mt-1.5" value={line} onChange={(e) => setLine(e.target.value)} placeholder="House / street / area" />
                  </div>
                  <div>
                    <Label htmlFor="c-city">City</Label>
                    <Input id="c-city" className="mt-1.5" value={city} onChange={(e) => setCity(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="c-state">State</Label>
                    <select
                      id="c-state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none"
                    >
                      <option value="">Select state</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="c-pincode">Pincode</Label>
                    <Input id="c-pincode" className="mt-1.5" value={pincode} onChange={(e) => setPincode(e.target.value)} inputMode="numeric" />
                  </div>
                  <div>
                    <Label htmlFor="c-note">Note for the farm (optional)</Label>
                    <Input
                      id="c-note"
                      className="mt-1.5"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. Leave at the gate before 5 pm"
                    />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <h2 className="flex items-center gap-2 text-[15px] font-bold">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">2</span>
                  Payment method
                </h2>
                <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPayment(m.id)}
                      className={cn(
                        "flex flex-col items-start gap-2 rounded-xl border p-3.5 text-left transition-all",
                        payment === m.id
                          ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30"
                          : "border-border bg-card hover:border-primary/40",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-lg",
                          payment === m.id ? "bg-primary text-primary-foreground" : "bg-accent text-primary",
                        )}
                      >
                        <m.icon className="size-4" />
                      </span>
                      <span className="text-sm font-semibold">{m.label}</span>
                      <span className="text-[11px] leading-4 text-muted-foreground">{m.sub}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-4 flex items-start gap-2 rounded-xl bg-accent/70 px-4 py-3 text-[13px] leading-6 text-accent-foreground">
                  <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
                  This marketplace runs in full demo mode: simulated approval,
                  simulated receipts, no real money or cards are ever charged.
                </p>
              </section>

              {quote && (quote.groups.length === 0 && !quote.couponError) && null}
              {quote?.couponError && (
                <div className="rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-[13px] text-amber-900">
                  {quote.couponError}
                </div>
              )}
            </div>

            {/* Right: quote summary */}
            <aside className="space-y-4 lg:sticky lg:top-24">
              {quote === null ? (
                <Loading label="Building your quote…" className="rounded-2xl border border-border bg-card py-16" />
              ) : (
                <>
                  {quote.groups.map((g, i) => (
                    <section key={g.farmerId} className="rounded-2xl border border-border bg-card">
                      <header className="flex items-center gap-2 border-b border-border px-4 py-3">
                        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1 truncate text-[14px] font-bold">
                            {g.farmerName}
                            <BadgeCheck className="size-3.5 shrink-0 text-primary" />
                          </p>
                          <p className="text-[11px] text-muted-foreground">{g.farmerLocation}</p>
                        </div>
                        <span className="font-mono text-sm font-bold">{inr(g.total)}</span>
                      </header>
                      <ul className="space-y-2.5 px-4 py-3.5">
                        {g.lines.map((l) => (
                          <li key={l.productId} className="flex items-center gap-2.5 text-[13px]">
                            <span className="text-base leading-none">{l.emoji}</span>
                            <span className="min-w-0 flex-1 truncate font-medium">
                              {l.name}
                              <span className="text-muted-foreground">
                                {" "}× {fmtQty(l.qty)} {l.unit}
                              </span>
                            </span>
                            <span className="font-mono font-semibold">{inr(l.total)}</span>
                          </li>
                        ))}
                      </ul>
                      <dl className="space-y-1.5 border-t border-dashed border-border px-4 py-3 text-[12.5px] text-muted-foreground">
                        <div className="flex justify-between">
                          <dt>Market rate value</dt>
                          <dd className="font-medium text-foreground/80">{inr(g.marketSubtotal)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Farm-gate discount</dt>
                          <dd className="font-medium text-emerald-700">− {inr(g.discountAmount)}</dd>
                        </div>
                        {g.couponDiscount > 0 && (
                          <div className="flex justify-between">
                            <dt>Coupon (spread)</dt>
                            <dd className="font-medium text-emerald-700">− {inr(g.couponDiscount)}</dd>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <dt>Platform fee</dt>
                          <dd className="font-medium text-foreground/80">{inr(g.platformFee)}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt>Delivery</dt>
                          <dd className="font-medium text-foreground/80">{inr(g.deliveryFee)}</dd>
                        </div>
                      </dl>
                    </section>
                  ))}

                  {quote.groups.length > 0 && (
                    <section className="rounded-2xl border border-border bg-card p-5">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        <TicketPercent className="size-3.5" /> Coupon
                      </p>
                      <div className="mt-2.5 flex gap-2">
                        <Input
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          placeholder="e.g. FRESH10"
                          className="h-10 font-mono text-[13px]"
                        />
                        <Button
                          variant="outline"
                          className="h-10"
                          disabled={!couponInput.trim()}
                          onClick={applyCoupon}
                        >
                          {quote.coupon ? "Applied" : "Apply"}
                        </Button>
                      </div>
                      {quote.coupon ? (
                        <p className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-emerald-700">
                          <CheckCircle2 className="size-3.5" /> {quote.coupon.title} — you save {inr(quote.couponDiscount)}
                        </p>
                      ) : (
                        quote.couponError ? (
                          <p className="mt-2 text-[12.5px] text-amber-700">{quote.couponError}</p>
                        ) : (
                          <p className="mt-2 text-[12px] text-muted-foreground">
                            Codes are validated by the marketplace before checkout.
                          </p>
                        )
                      )}
                    </section>
                  )}

                  {quote.groups.length === 0 && (
                    <section className="rounded-2xl border border-border bg-card p-5 text-center">
                      <Percent className="mx-auto size-6 text-muted-foreground" />
                      <p className="mt-2 text-sm font-semibold">Add a valid coupon or continue</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {quote.couponError ? "Fix the code above to see savings." : "Public offers apply at the market banner."}
                      </p>
                    </section>
                  )}

                  {quote.groups.length > 0 && (
                    <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-5">
                      <dl className="space-y-1.5 text-[13px]">
                        <div className="flex justify-between text-muted-foreground">
                          <dt>Produce ({fmtQty(quote.itemCount)} units)</dt>
                          <dd className="font-medium text-foreground">{inr(quote.discountedSubtotal)}</dd>
                        </div>
                        {quote.discountAmount > 0 && (
                          <div className="flex justify-between text-muted-foreground">
                            <dt>Market discount</dt>
                            <dd className="font-medium text-emerald-700">− {inr(quote.discountAmount)}</dd>
                          </div>
                        )}
                        {quote.couponDiscount > 0 && (
                          <div className="flex justify-between text-muted-foreground">
                            <dt>Coupon saving</dt>
                            <dd className="font-medium text-emerald-700">− {inr(quote.couponDiscount)}</dd>
                          </div>
                        )}
                        <div className="flex justify-between text-muted-foreground">
                          <dt>Fees & delivery</dt>
                          <dd className="font-medium text-foreground">{inr(quote.platformFee + quote.deliveryFee)}</dd>
                        </div>
                        <div className="mt-2 flex items-center justify-between border-t border-dashed border-border pt-2.5">
                          <dt className="font-bold text-foreground">Total payable</dt>
                          <dd className="font-mono text-xl font-bold text-foreground">{inr(quote.total)}</dd>
                        </div>
                      </dl>
                      <Button
                        size="lg"
                        className="mt-4 w-full gap-2"
                        disabled={placing}
                        onClick={() => void place()}
                      >
                        {placing ? (
                          <Loader2 className="size-4.5 animate-spin" />
                        ) : payment === "cod" ? (
                          <Truck className="size-4.5" />
                        ) : (
                          <Lock className="size-4.5" />
                        )}
                        {placing
                          ? "Placing order…"
                          : payment === "cod"
                            ? "Place order · pay on delivery"
                            : `Place order · ${inr(quote.total)}`}
                      </Button>
                      <p className="mt-2.5 text-center text-[11px] leading-4 text-muted-foreground">
                        By placing this demo order you confirm the delivery address.
                        <br />
                        No real payment is processed.
                      </p>
                    </div>
                  )}
                </>
              )}
            </aside>
          </div>
        )}
      </Container>
    </div>
  );
}
