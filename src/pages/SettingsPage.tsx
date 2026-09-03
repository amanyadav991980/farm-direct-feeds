import { SiteHeader } from "@/components/site-header";
import { WorkspaceNav, type WorkspaceTab } from "@/components/workspace-nav";
import { Container, Loading } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { roleHome, ROLE_LABEL } from "@/lib/role";
import { errMsg } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { BadgeCheck, KeyRound, Loader2, MapPin, Save, Store, User } from "lucide-react";
import { useState } from "react";
import { Link, Navigate } from "react-router";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel";

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

type Profile = Doc<"users">;

type Farm = {
  id: string;
  farmName: string;
  village: string;
  district: string;
  state: string;
  phone: string;
  bio: string;
  yearsFarming: number;
  verified: boolean;
};

function StateSelect({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  id: string;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none"
    >
      <option value="">Select state</option>
      {INDIAN_STATES.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}

function navTabs(role: string | undefined, farmId?: string): WorkspaceTab[] {
  if (role === "farmer") {
    return [
      { to: "/farmer", label: "Overview", end: true },
      { to: "/farmer/products", label: "Listings" },
      { to: "/farmer/orders", label: "Orders" },
      { to: "/farmer/inquiries", label: "Inquiries" },
      { to: "/farmer/insights", label: "Insights" },
    ];
  }
  return [
    { to: "/buyer", label: "Overview", end: true },
    { to: "/buyer/orders", label: "Orders" },
    { to: "/buyer/messages", label: "Messages" },
  ];
}

export default function SettingsPage() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const profile = useQuery(api.profiles.myProfile);
  const farm = useQuery(api.farmers.myFarm);

  if (isLoading || profile === undefined || (user?.role === "farmer" && farm === undefined)) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <Loading label="Loading your settings…" />
      </div>
    );
  }
  if (!isAuthenticated || !user?.role || !profile) {
    return <Navigate to={user?.role ? roleHome(user.role) : "/welcome"} replace />;
  }
  const isFarmer = user.role === "farmer";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <Container className="py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {ROLE_LABEL[user.role]} account
            </p>
            <h1 className="mt-1.5 text-2xl font-bold sm:text-3xl">Account settings</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Keep your contact details and delivery information current.
            </p>
          </div>
        </div>
        <WorkspaceNav tabs={navTabs(user.role)} className="mt-6" />

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <ProfileCard key={profile._id} profile={profile} isFarmer={isFarmer} />
            {isFarmer && farm ? (
              <FarmCard key={farm.id} farm={farm as unknown as Farm} />
            ) : null}
          </div>
          <aside className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[15px]">
                  <BadgeCheck className="size-4 text-primary" /> Your role
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  You signed up as a <span className="font-semibold text-foreground">{ROLE_LABEL[user.role]}</span>.
                  {user.role === "buyer" && " You can browse, order and message any verified farm."}
                  {user.role === "farmer" && (
                    <>
                      {" "}
                      Sign out and re-onboard if you need to change how you use the marketplace.
                    </>
                  )}
                </p>
                {isFarmer && (
                  <Link
                    to={`/farmer/${farm?.id ?? ""}`}
                    className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary hover:underline"
                  >
                    <Store className="size-3.5" /> View public farm page
                  </Link>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-[15px]">
                  <KeyRound className="size-4 text-primary" /> Sign-in
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>
                  Signed in with{" "}
                  <span className="font-semibold text-foreground">
                    {profile.isAnonymous ? "a guest demo session" : profile.email ?? "email magic link"}
                  </span>
                  . Signing out keeps your orders and farm profile safe here.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </Container>
    </div>
  );
}

function ProfileCard({ profile, isFarmer }: { profile: Profile; isFarmer: boolean }) {
  const updateMyProfile = useMutation(api.profiles.updateMyProfile);
  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [addressLine, setAddressLine] = useState(profile.addressLine ?? "");
  const [city, setCity] = useState(profile.city ?? "");
  const [state, setState] = useState(profile.state ?? "");
  const [pincode, setPincode] = useState(profile.pincode ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateMyProfile({
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        addressLine: addressLine.trim() || undefined,
        city: city.trim() || undefined,
        state: state || undefined,
        pincode: pincode.trim() || undefined,
      });
      toast.success("Profile updated");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <User className="size-4 text-primary" /> Personal details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="p-name">Full name</Label>
            <Input id="p-name" className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="p-phone">Phone</Label>
            <Input id="p-phone" className="mt-1.5" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
          </div>
          {!isFarmer && (
            <>
              <div className="sm:col-span-2">
                <Label htmlFor="p-address">Delivery address</Label>
                <Input id="p-address" className="mt-1.5" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="p-city">City</Label>
                <Input id="p-city" className="mt-1.5" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="p-state">State</Label>
                <StateSelect id="p-state" value={state} onChange={setState} />
              </div>
              <div>
                <Label htmlFor="p-pincode">Pincode</Label>
                <Input id="p-pincode" className="mt-1.5" value={pincode} onChange={(e) => setPincode(e.target.value)} inputMode="numeric" />
              </div>
            </>
          )}
        </div>
        <Button className="mt-5 gap-2" disabled={saving} onClick={() => void save()}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save changes
        </Button>
      </CardContent>
    </Card>
  );
}

function FarmCard({ farm }: { farm: Farm }) {
  const updateFarmProfile = useMutation(api.farmers.updateFarmProfile);
  const [farmName, setFarmName] = useState(farm.farmName);
  const [village, setVillage] = useState(farm.village);
  const [district, setDistrict] = useState(farm.district);
  const [state, setState] = useState(farm.state);
  const [phone, setPhone] = useState(farm.phone);
  const [bio, setBio] = useState(farm.bio);
  const [yearsFarming, setYearsFarming] = useState(String(farm.yearsFarming));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateFarmProfile({
        farmName: farmName.trim() || undefined,
        village: village.trim() || undefined,
        district: district.trim() || undefined,
        state: state || undefined,
        phone: phone.trim() || undefined,
        bio: bio.trim() || undefined,
        yearsFarming: Number(yearsFarming) || undefined,
      });
      toast.success("Farm profile updated");
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-[15px]">
          <MapPin className="size-4 text-primary" /> Farm profile
          {farm.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-emerald-800">
              <BadgeCheck className="size-3" /> Verified
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="f-name">Farm name</Label>
            <Input id="f-name" className="mt-1.5" value={farmName} onChange={(e) => setFarmName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="f-phone">Farm phone</Label>
            <Input id="f-phone" className="mt-1.5" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" />
          </div>
          <div>
            <Label htmlFor="f-village">Village</Label>
            <Input id="f-village" className="mt-1.5" value={village} onChange={(e) => setVillage(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="f-district">District</Label>
            <Input id="f-district" className="mt-1.5" value={district} onChange={(e) => setDistrict(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="f-state">State</Label>
            <StateSelect id="f-state" value={state} onChange={setState} />
          </div>
          <div>
            <Label htmlFor="f-years">Years farming</Label>
            <select
              id="f-years"
              value={yearsFarming}
              onChange={(e) => setYearsFarming(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none"
            >
              {Array.from({ length: 45 }, (_, i) => String(i + 1)).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="f-bio">About the farm</Label>
            <Textarea id="f-bio" className="mt-1.5" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
        </div>
        <Button className="mt-5 gap-2" disabled={saving} onClick={() => void save()}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save farm profile
        </Button>
      </CardContent>
    </Card>
  );
}
