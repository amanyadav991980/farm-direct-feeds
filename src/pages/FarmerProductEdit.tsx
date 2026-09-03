import { SiteHeader } from "@/components/site-header";
import { CropArt } from "@/components/crop-art";
import { WorkspaceNav } from "@/components/workspace-nav";
import { Container, Loading } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { errMsg, fmtQty, inr } from "@/lib/format";
import { CATEGORY_CHIP } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Leaf,
  Loader2,
  PackagePlus,
  Pencil,
  Save,
  Sprout,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

const CATEGORIES = ["Vegetables", "Fruits", "Grains", "Pulses", "Oilseeds", "Other"] as const;

const FARMER_TABS = [
  { to: "/farmer", label: "Overview", end: true },
  { to: "/farmer/products", label: "Listings" },
  { to: "/farmer/orders", label: "Orders" },
  { to: "/farmer/inquiries", label: "Inquiries" },
  { to: "/farmer/insights", label: "Insights" },
];

function toDateInput(ts?: number): string {
  if (!ts) return "";
  return new Date(ts).toISOString().slice(0, 10);
}

export default function FarmerProductEdit() {
  const { productId } = useParams();
  const isEdit = !!productId;

  if (isEdit) return <EditForm key={productId} productId={productId as string} />;
  return <NewForm />;
}

function NewForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const crops = useQuery(api.crops.listCrops, {});
  const settings = useQuery(api.settings.getSettings);
  const addProduct = useMutation(api.products.addProduct);

  const [category, setCategory] = useState<string>("Vegetables");
  const [cropId, setCropId] = useState("");
  const [marketPrice, setMarketPrice] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [minOrderQty, setMinOrderQty] = useState("");
  const [grade, setGrade] = useState("Grade A");
  const [organic, setOrganic] = useState(true);
  const [harvestDate, setHarvestDate] = useState(toDateInput(Date.now()));
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const inCategory = useMemo(
    () => (crops ?? []).filter((c) => c.category === category),
    [crops, category],
  );
  const crop = (crops ?? []).find((c) => c._id === cropId) ?? null;
  const discountPct = settings?.marketDiscountPercent ?? 10;
  const price = Math.max(0, Number(marketPrice) || 0);
  const unitPrice = Math.round(price * (1 - discountPct / 100));

  const pickCrop = (id: string) => {
    setCropId(id);
    const c = (crops ?? []).find((x) => x._id === id);
    if (c) {
      setMarketPrice(String(c.marketPrice));
      setOrganic(c.organicDefault);
    }
  };

  const save = async () => {
    if (!user?.role) return;
    if (!crop) {
      toast.error("Choose the crop you are listing first.");
      return;
    }
    if (price <= 0) {
      toast.error("Enter a market price above zero.");
      return;
    }
    const stock = Math.max(0, Math.round(Number(stockQty) || 0));
    if (stock <= 0) {
      toast.error("Add the lot size in stock first.");
      return;
    }
    const date = harvestDate ? new Date(`${harvestDate}T12:00:00`).getTime() : Date.now();
    setSaving(true);
    try {
      await addProduct({
        cropId: crop._id as never,
        marketPrice: price,
        stockQty: stock,
        minOrderQty: Math.max(1, Math.round(Number(minOrderQty) || 1)),
        grade: grade.trim() || "Grade A",
        organic,
        harvestDate: date,
        description: description.trim() || undefined,
      });
      toast.success(`${crop.name} is live on the market`, {
        description: `${fmtQty(stock)} ${crop.unit} at ${inr(unitPrice)}/${crop.unit}`,
      });
      navigate("/farmer/products");
    } catch (e) {
      toast.error(errMsg(e));
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Container className="py-10">
        <Link
          to="/farmer/products"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to listings
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Farmer dashboard
            </p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">List a new crop</h1>
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              Choose from the platform catalogue — your lot appears in the fresh
              market the moment you publish.
            </p>
          </div>
        </div>
        <WorkspaceNav tabs={FARMER_TABS} className="mt-6" />

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
            {crops === undefined ? (
              <Loading label="Loading crop catalogue…" />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="crop-category">Category</Label>
                    <select
                      id="crop-category"
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        setCropId("");
                      }}
                      className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="crop-name">
                      Crop <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="crop-name"
                      value={cropId}
                      onChange={(e) => pickCrop(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none"
                    >
                      <option value="">Select crop…</option>
                      {inCategory.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({CATEGORY_CHIP[c.category] ?? c.category})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {crop && (
                  <div className="flex items-start gap-3 rounded-xl bg-accent/60 px-4 py-3 text-[13px] leading-6 text-accent-foreground">
                    <span className="text-xl">{crop.emoji}</span>
                    <div>
                      <p className="font-semibold">{crop.name}</p>
                      <p className="text-accent-foreground/90">
                        {crop.description} Market reference ₹{crop.marketPrice}/
                        {crop.unit} · shelf life ~{crop.shelfLifeDays} days.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="c-price">
                      Market rate (₹ / {crop?.unit ?? "unit"}){" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="c-price"
                      className="mt-1.5 font-mono"
                      type="number"
                      min={1}
                      value={marketPrice}
                      onChange={(e) => setMarketPrice(e.target.value)}
                      placeholder="e.g. 40"
                    />
                  </div>
                  <div>
                    <Label htmlFor="c-stock">
                      Lot size ({crop?.unit ?? "units"}) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="c-stock"
                      className="mt-1.5 font-mono"
                      type="number"
                      min={0}
                      value={stockQty}
                      onChange={(e) => setStockQty(e.target.value)}
                      placeholder="e.g. 500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="c-min">Minimum order</Label>
                    <Input
                      id="c-min"
                      className="mt-1.5 font-mono"
                      type="number"
                      min={1}
                      value={minOrderQty}
                      onChange={(e) => setMinOrderQty(e.target.value)}
                      placeholder="default 5"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="c-grade">Grade</Label>
                    <select
                      id="c-grade"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none"
                    >
                      {["Grade A", "Grade B", "Premium", "Export"].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="c-harvest">Harvest date</Label>
                    <Input
                      id="c-harvest"
                      className="mt-1.5"
                      type="date"
                      value={harvestDate}
                      max={toDateInput(Date.now())}
                      onChange={(e) => setHarvestDate(e.target.value)}
                    />
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3">
                  <input
                    type="checkbox"
                    checked={organic}
                    onChange={(e) => setOrganic(e.target.checked)}
                    className="size-4 accent-primary"
                  />
                  <span>
                    <span className="flex items-center gap-1.5 text-sm font-semibold">
                      <Leaf className="size-4 text-primary" /> Organically grown
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Shown as an organic badge across the marketplace.
                    </span>
                  </span>
                </label>

                <div>
                  <Label htmlFor="c-desc">Description (optional)</Label>
                  <Textarea
                    id="c-desc"
                    className="mt-1.5"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Harvest notes, variety, land practices, packing…"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 border-t border-dashed border-border pt-5">
                  <Button size="lg" className="gap-2" disabled={saving || !crop} onClick={() => void save()}>
                    {saving ? (
                      <Loader2 className="size-4.5 animate-spin" />
                    ) : (
                      <PackagePlus className="size-4.5" />
                    )}
                    {saving ? "Publishing…" : "Publish listing"}
                  </Button>
                  <Button size="lg" variant="ghost" asChild>
                    <Link to="/farmer/products">Cancel</Link>
                  </Button>
                </div>
              </>
            )}
          </div>

          {/* Preview */}
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <p className="border-b border-border bg-muted/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Listing preview
              </p>
              <CropArt
                emoji={crop?.emoji ?? "🌱"}
                tint={crop?.tint ?? 0}
                name={crop?.name ?? "Your crop"}
                className="aspect-[5/3] w-full"
                glyphClassName="text-6xl"
              />
              <div className="p-4">
                <p className="text-[15px] font-bold">{crop?.name ?? "Select a crop to preview"}</p>
                <p className="text-xs text-muted-foreground">
                  {crop?.category ?? ""} · {grade} ·{" "}
                  {organic ? "organic" : "conventional"}
                </p>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="font-mono text-2xl font-bold">{inr(unitPrice)}</span>
                  <span className="font-mono text-xs text-muted-foreground">/ {crop?.unit ?? "kg"}</span>
                  {price > 0 && discountPct > 0 && (
                    <>
                      <span className="font-mono text-sm text-muted-foreground line-through">
                        {inr(price)}
                      </span>
                      <span className="rounded-sm bg-emerald-100 px-1 font-mono text-[10px] font-semibold text-emerald-800">
                        {discountPct}% off
                      </span>
                    </>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="size-3.5 text-primary" />
                    Harvest {harvestDate || "today"}
                  </span>
                  <span>
                    {Number(stockQty) > 0
                      ? `${fmtQty(Number(stockQty))} ${crop?.unit ?? ""} in stock`
                      : "Stock not set"}
                  </span>
                </div>
              </div>
            </div>
            <p className="flex items-start gap-2 px-1 text-xs leading-5 text-muted-foreground">
              <Sprout className="mt-0.5 size-4 shrink-0 text-primary" />
              Buyers see your price next to the reference market rate. Raising
              stock above your lot&apos;s baseline is allowed any time.
            </p>
          </aside>
        </div>
      </Container>
    </div>
  );
}

function EditForm({ productId }: { productId: string }) {
  const navigate = useNavigate();
  const product = useQuery(api.products.getProductForEdit, { productId: productId as never });
  const settings = useQuery(api.settings.getSettings);
  const updateProduct = useMutation(api.products.updateProduct);
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [minQty, setMinQty] = useState("");
  const [grade, setGrade] = useState("Grade A");
  const [organic, setOrganic] = useState(true);
  const [active, setActive] = useState(true);
  const [harvestDate, setHarvestDate] = useState("");
  const [description, setDescription] = useState("");
  const [init, setInit] = useState(false);
  const [saving, setSaving] = useState(false);

  if (product && !init) {
    setInit(true);
    setPrice(String(product.marketPrice));
    setStock(String(product.stockQty));
    setMinQty(String(product.minOrderQty));
    setGrade(product.grade);
    setOrganic(product.organic);
    setActive(product.isActive);
    setHarvestDate(toDateInput(product.harvestDate));
    setDescription(product.description);
  }

  const discountPct = settings?.marketDiscountPercent ?? 10;
  const priceNum = Math.max(0, Number(price) || 0);
  const unitPrice = Math.round(priceNum * (1 - discountPct / 100));

  const save = async () => {
    if (!product) return;
    if (priceNum <= 0) {
      toast.error("Enter a market price above zero.");
      return;
    }
    setSaving(true);
    try {
      const date = harvestDate
        ? new Date(`${harvestDate}T12:00:00`).getTime()
        : undefined;
      await updateProduct({
        productId: product._id as never,
        marketPrice: priceNum,
        stockQty: Math.max(0, Math.round(Number(stock) || 0)),
        minOrderQty: Math.max(1, Math.round(Number(minQty) || product.minOrderQty)),
        grade: grade.trim() || product.grade,
        organic,
        isActive: active,
        harvestDate: date,
        description: description.trim() || product.description,
      });
      toast.success(`${product.name} updated`);
      navigate("/farmer/products");
    } catch (e) {
      toast.error(errMsg(e));
      setSaving(false);
    }
  };

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <Container>
          <Loading label="Loading listing…" />
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Container className="py-10">
        <Link
          to="/farmer/products"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to listings
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Farmer dashboard
            </p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">
              <span className="mr-2">{product.emoji}</span>Edit {product.name}
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Changes publish instantly — buyers on the market see the new lot
              details immediately.
            </p>
          </div>
        </div>
        <WorkspaceNav tabs={FARMER_TABS} className="mt-6" />

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="e-price">Market rate (₹ / {product.unit})</Label>
                <Input
                  id="e-price"
                  className="mt-1.5 font-mono"
                  type="number"
                  min={1}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="e-stock">Stock ({product.unit})</Label>
                <Input
                  id="e-stock"
                  className="mt-1.5 font-mono"
                  type="number"
                  min={0}
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="e-min">Minimum order</Label>
                <Input
                  id="e-min"
                  className="mt-1.5 font-mono"
                  type="number"
                  min={1}
                  value={minQty}
                  onChange={(e) => setMinQty(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="e-grade">Grade</Label>
                <select
                  id="e-grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none"
                >
                  {["Grade A", "Grade B", "Premium", "Export"].map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="e-harvest">Harvest date</Label>
                <Input
                  id="e-harvest"
                  className="mt-1.5"
                  type="date"
                  value={harvestDate}
                  max={toDateInput(Date.now())}
                  onChange={(e) => setHarvestDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3">
                <input
                  type="checkbox"
                  checked={organic}
                  onChange={(e) => setOrganic(e.target.checked)}
                  className="size-4 accent-primary"
                />
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Leaf className="size-4 text-primary" /> Organic badge
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="size-4 accent-primary"
                />
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {active ? <Check className="size-4 text-primary" /> : <Pencil className="size-4 text-muted-foreground" />}
                  Live on the market
                </span>
              </label>
            </div>

            <div>
              <Label htmlFor="e-desc">Description</Label>
              <Textarea
                id="e-desc"
                className="mt-1.5"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-dashed border-border pt-5">
              <Button size="lg" className="gap-2" disabled={saving} onClick={() => void save()}>
                {saving ? <Loader2 className="size-4.5 animate-spin" /> : <Save className="size-4.5" />}
                {saving ? "Saving…" : "Save changes"}
              </Button>
              <Button size="lg" variant="ghost" asChild>
                <Link to="/farmer/products">Cancel</Link>
              </Button>
            </div>
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <p className="border-b border-border bg-muted/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Live price preview
              </p>
              <div className="p-4">
                <p className="text-[15px] font-bold">{product.name}</p>
                <p className="text-xs text-muted-foreground">
                  {product.category} · {grade} · {organic ? "organic" : "conventional"}
                </p>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="font-mono text-2xl font-bold">{inr(unitPrice)}</span>
                  <span className="font-mono text-xs text-muted-foreground">/ {product.unit}</span>
                  {priceNum > 0 && discountPct > 0 && (
                    <span className="font-mono text-sm text-muted-foreground line-through">
                      {inr(priceNum)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Buyers pay {discountPct}% under your market rate — shown as a
                  farm-gate discount.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}
