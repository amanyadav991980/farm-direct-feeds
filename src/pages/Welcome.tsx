import { BrandMark } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { roleHome } from "@/lib/role";
import { errMsg } from "@/lib/format";
import { useMutation } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Landmark,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBasket,
  Sprout,
  Store,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Role } from "@/convex/schema";

type RoleChoice = {
  role: Role;
  icon: typeof Sprout;
  title: string;
  tagline: string;
  points: string[];
  adminOnly?: boolean;
};

const CHOICES: RoleChoice[] = [
  {
    role: "buyer",
    icon: ShoppingBasket,
    title: "Buy fresh produce",
    tagline: "For households, kitchens and small businesses",
    points: [
      "Shop live harvests from verified farms",
      "Bulk lots, coupons and doorstep delivery",
      "Track every order from field to door",
    ],
  },
  {
    role: "farmer",
    icon: Sprout,
    title: "Sell your harvest",
    tagline: "For growers and farmer producer organisations",
    points: [
      "List crops against the market price in minutes",
      "Manage stock, orders and earnings in one place",
      "Reach households and bulk buyers directly",
    ],
  },
  {
    role: "admin",
    icon: ShieldCheck,
    title: "Platform operator",
    tagline: "Demo command centre for the marketplace",
    points: [
      "Marketplace analytics and order overview",
      "Coupon management and platform settings",
      "Farmer rankings and live performance",
    ],
    adminOnly: true,
  },
];

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

export default function Welcome() {
  const { isLoading: authLoading, isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const completeOnboarding = useMutation(api.profiles.completeOnboarding);

  const returnTo = searchParams.get("returnTo");
  const preselect = searchParams.get("role");

  const [role, setRole] = useState<Role>(
    preselect === "farmer" || preselect === "admin" ? preselect : "buyer",
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  // farmer fields
  const [farmName, setFarmName] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [farmState, setFarmState] = useState("");
  const [yearsFarming, setYearsFarming] = useState("5");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.name) setName(user.name);
  }, [authLoading, isAuthenticated, user?.name]);

  const safeReturn = (role: Role) =>
    returnTo?.startsWith("/") &&
    !returnTo.startsWith("//") &&
    returnTo !== "/" &&
    !returnTo.startsWith("/welcome")
      ? returnTo
      : roleHome(role);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    if (user?.role && user.onboardedAt) {
      navigate(safeReturn(user.role), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, user?.role, user?.onboardedAt, returnTo, navigate]);

  const choices = useMemo(
    () =>
      user?.isAnonymous
        ? CHOICES
        : CHOICES.filter((c) => !c.adminOnly),
    [user?.isAnonymous],
  );

  const destination = () => safeReturn(role);

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }
    if (role === "farmer") {
      if (!phone.trim() || !/^[0-9+\s-]{10,15}$/.test(phone.trim())) {
        setError("Enter a reachable phone number so buyers can contact you.");
        return;
      }
      if (!village.trim() || !district.trim() || !farmState) {
        setError("Add your farm village, district and state.");
        return;
      }
    }
    setSubmitting(true);
    try {
      await completeOnboarding({
        role,
        name: name.trim(),
        phone: phone.trim() || undefined,
        addressLine: addressLine.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
        farmName: farmName.trim() || undefined,
        village: village.trim() || undefined,
        district: district.trim() || undefined,
        farmState: farmState || undefined,
        yearsFarming: Number(yearsFarming) || undefined,
        bio: bio.trim() || undefined,
      });
      toast.success(
        role === "farmer"
          ? "Your farm profile is live"
          : role === "admin"
            ? "Operator workspace ready"
            : "Welcome to Farm Direct",
      );
      navigate(destination(), { replace: true });
    } catch (e) {
      setError(errMsg(e));
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="max-w-sm text-center">
          <p className="text-sm text-muted-foreground">
            Sign in to set up your Farm Direct workspace.
          </p>
          <Button
            className="mt-5"
            onClick={() =>
              navigate(`/auth?returnTo=${encodeURIComponent(returnTo ?? "/welcome")}`)
            }
          >
            Go to sign in <ArrowRight className="size-4" />
          </Button>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <div className="fd-grid min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:py-12">
        {/* Left — positioning panel */}
        <div className="hidden flex-col justify-between rounded-3xl border border-border bg-card/80 p-8 lg:flex">
          <div>
            <Link to="/" className="inline-flex">
              <BrandMark />
            </Link>
            <h1 className="mt-10 text-balance text-4xl font-bold leading-tight">
              Set up your Farm Direct workspace
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-7 text-muted-foreground">
              One account, three ways to use the marketplace. Choose the role
              that fits what you grow or what you buy — your dashboard, orders
              and notifications follow from there.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                {
                  icon: Landmark,
                  text: "Transparent, market-linked prices on every listing",
                },
                {
                  icon: BadgeCheck,
                  text: "Verified farms and protected contact details",
                },
                {
                  icon: Store,
                  text: "One account across buying, selling and orders",
                },
              ].map((p) => (
                <li key={p.text} className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                    <p.icon className="size-4" />
                  </span>
                  {p.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card p-5">
            <p className="flex items-center gap-2 text-[13px] font-semibold">
              <ShieldCheck className="size-4 text-primary" />
              {user.isAnonymous
                ? "Guest demo session"
                : `Signed in as ${user.email ?? user.name ?? "you"}`}
            </p>
            <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">
              {user.isAnonymous
                ? "Guest sessions can drive the buyer, farmer or admin demo. The admin workspace is only available to this guest session."
                : "Use the email magic link again whenever you return. This stays a demo marketplace — no real money moves."}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 gap-1.5 px-0 text-[13px] text-muted-foreground hover:bg-transparent hover:text-destructive"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
            >
              Sign out and start over
            </Button>
          </div>
        </div>

        {/* Right — role choice + form */}
        <div className="flex flex-col justify-center py-4">
          <div className="mb-5 flex items-center justify-between lg:hidden">
            <BrandMark />
            <button
              type="button"
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
              onClick={() => navigate("/")}
              aria-label="Back to home"
            >
              <ArrowLeft className="size-5" />
            </button>
          </div>

          <h2 className="text-xl font-bold sm:text-2xl">Who will you be on Farm Direct?</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            You can sign out and pick another role any time.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-1">
            {choices.map((c) => {
              const selected = role === c.role;
              return (
                <button
                  key={c.role}
                  type="button"
                  onClick={() => {
                    setRole(c.role);
                    setError(null);
                  }}
                  className={cn(
                    "flex items-start gap-4 rounded-2xl border p-4 text-left transition-all",
                    selected
                      ? "border-primary bg-primary/[0.06] ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl",
                      selected ? "bg-primary text-primary-foreground" : "bg-accent text-primary",
                    )}
                  >
                    <c.icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-foreground">
                      {c.title}
                      <span className="text-xs font-medium text-muted-foreground">
                        {c.tagline}
                      </span>
                    </span>
                    <span className="mt-1 block text-[13px] leading-5 text-muted-foreground">
                      {c.points.join(" · ")}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "mt-1.5 size-4 shrink-0 rounded-full border-2",
                      selected ? "border-primary bg-primary" : "border-border bg-card",
                    )}
                    aria-hidden
                  />
                </button>
              );
            })}
          </div>

          {/* Profile form */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <p className="flex items-center gap-2 text-[15px] font-bold">
              <User className="size-4 text-primary" />
              {role === "farmer" ? "Your farm details" : "Your details"}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="w-name">Full name</Label>
                <Input
                  id="w-name"
                  className="mt-1.5"
                  placeholder={role === "farmer" ? "e.g. Rajesh Kumar" : "Your name"}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="w-phone">
                  Phone {role === "farmer" && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  id="w-phone"
                  className="mt-1.5"
                  placeholder="+91 …"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  inputMode="tel"
                />
              </div>
              {role === "buyer" && (
                <>
                  <div>
                    <Label htmlFor="w-city">City</Label>
                    <Input
                      id="w-city"
                      className="mt-1.5"
                      placeholder="e.g. Pune"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="w-address">Delivery address (line)</Label>
                    <Input
                      id="w-address"
                      className="mt-1.5"
                      placeholder="House / street / area"
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="w-state">State</Label>
                    <select
                      id="w-state"
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
                    <Label htmlFor="w-pincode">Pincode</Label>
                    <Input
                      id="w-pincode"
                      className="mt-1.5"
                      placeholder="6 digits"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      inputMode="numeric"
                    />
                  </div>
                </>
              )}
            </div>

            {role === "farmer" && (
              <div className="mt-4 rounded-xl border border-border bg-muted/40 p-4">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                  <MapPin className="size-3.5 text-primary" />
                  Farm location — shown on your public farm page
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="f-farmname">Farm name</Label>
                    <Input
                      id="f-farmname"
                      className="mt-1.5"
                      placeholder={`${name.split(" ")[0] || "My"} Farm`}
                      value={farmName}
                      onChange={(e) => setFarmName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="f-village">
                      Village <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="f-village"
                      className="mt-1.5"
                      placeholder="e.g. Wadgaon"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="f-district">
                      District <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="f-district"
                      className="mt-1.5"
                      placeholder="e.g. Pune"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="f-farmstate">
                      State <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="f-farmstate"
                      value={farmState}
                      onChange={(e) => setFarmState(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none"
                    >
                      <option value="">Select state</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="f-years">Farming experience</Label>
                    <select
                      id="f-years"
                      value={yearsFarming}
                      onChange={(e) => setYearsFarming(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none"
                    >
                      {Array.from({ length: 40 }, (_, i) => String(i + 1)).map((y) => (
                        <option key={y} value={y}>{y} {y === "1" ? "year" : "years"}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="f-bio">About the farm (optional)</Label>
                    <Textarea
                      id="f-bio"
                      className="mt-1.5"
                      rows={2}
                      placeholder="Crops you grow, organic practices, land size…"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-[13px] font-medium text-destructive">
                {error}
              </p>
            )}

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="gap-2"
                disabled={submitting}
                onClick={() => void submit()}
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : role === "farmer" ? (
                  <Sprout className="size-4.5" />
                ) : (
                  <ArrowRight className="size-4.5" />
                )}
                {submitting
                  ? "Setting up…"
                  : role === "farmer"
                    ? "Register my farm"
                    : role === "admin"
                      ? "Open the command centre"
                      : "Continue to the market"}
              </Button>
              <p className="text-xs text-muted-foreground">
                {role === "farmer"
                  ? "Your farm profile appears in the marketplace for buyers to message."
                  : role === "buyer"
                    ? "Free to join — payment happens per order, never upfront."
                    : "Guest demo only — no payments or real data."}
              </p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-5 flex items-center gap-2 px-1 text-xs text-muted-foreground"
          >
            <Phone className="size-3.5 text-primary" />
            Need help? Email the platform team — every marketplace question has a real answer.
          </motion.div>
        </div>
      </div>
    </div>
  );
}
