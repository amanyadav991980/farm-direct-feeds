import { useAuth } from "@/hooks/use-auth";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { roleHome, roleHomeLabel } from "@/lib/role";
import { Bell, ChevronDown, LogOut, Menu, Search, ShoppingBasket, Sprout, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Sprout className="size-[18px]" strokeWidth={2.2} />
      </span>
      <span className="text-[17px] font-bold tracking-tight text-foreground">
        Farm<span className="text-primary">Direct</span>
      </span>
    </span>
  );
}

export function SiteHeader() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const cartCount = useQuery(api.cart.cartCount);
  const unread = useQuery(api.notifications.unreadCount);

  const toAuth = (returnTo: string) =>
    navigate(`/auth?returnTo=${encodeURIComponent(returnTo)}`);

  const goSearch = () => {
    const query = q.trim();
    if (query) navigate(`/fresh?q=${encodeURIComponent(query)}`);
    else navigate("/fresh");
    setOpen(false);
  };

  const signOutAndGo = async () => {
    await signOut();
    navigate("/");
  };

  const navLink = (to: string, label: string) => (
    <Link
      key={to + label}
      to={to}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground ${
        location.pathname === to ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" className="shrink-0" aria-label="Farm Direct home">
          <BrandMark />
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {navLink("/fresh", "Fresh market")}
          {navLink("/#how", "How it works")}
          {navLink("/#farmers", "For farmers")}
          {navLink("/assistant", "Ask AI")}
        </nav>

        <form
          className="relative ml-auto hidden w-full max-w-xs md:block"
          onSubmit={(e) => {
            e.preventDefault();
            goSearch();
          }}
        >
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search produce, crops…"
            className="h-9 rounded-full bg-card pl-9 text-sm"
            aria-label="Search the market"
          />
        </form>

        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          {isLoading ? null : isAuthenticated ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden gap-1.5 text-[13px] font-medium xl:inline-flex"
                onClick={() => navigate(roleHome(user?.role))}
              >
                <Sprout className="size-4 text-primary" />
                {roleHomeLabel(user?.role)}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label="Notifications"
                onClick={() => navigate("/notifications")}
              >
                <Bell className="size-[18px]" />
                {!!unread && (
                  <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label="Your basket"
                onClick={() => navigate("/cart")}
              >
                <ShoppingBasket className="size-[18px]" />
                {!!cartCount && (
                  <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-[13px] font-medium">
                    <span className="flex size-6 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
                      {(user?.name ?? "M").slice(0, 1).toUpperCase()}
                    </span>
                    <span className="hidden max-w-28 truncate sm:inline">
                      {user?.name?.split(" ")[0] ?? "Account"}
                    </span>
                    <ChevronDown className="size-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-medium">
                    {user?.name ?? "Signed in"}
                    <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                      {user?.role ? `${roleHomeLabel(user?.role).replace(" dashboard", "")} account` : "Choose your role to continue"}
                    </p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onClick={() => navigate(roleHome(user?.role))}>
                    Open dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/notifications")}>
                    Notifications
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/cart")}>
                    My basket
                  </DropdownMenuItem>
                  {user?.role === "buyer" && (
                    <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/buyer/orders")}>
                      My orders
                    </DropdownMenuItem>
                  )}
                  {user?.role === "farmer" && (
                    <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/farmer/products")}>
                      My listings
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/assistant")}>
                    Ask the assistant
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={signOutAndGo}
                  >
                    <LogOut className="mr-2 size-4" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="text-[13px] font-medium" onClick={() => toAuth("/buyer")}>
                Sign in
              </Button>
              <Button size="sm" className="text-[13px] font-medium" onClick={() => toAuth("/buyer")}>
                Create account
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-card lg:hidden">
          <div className="space-y-1 px-4 py-3">
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault();
                goSearch();
              }}
            >
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search produce, crops…"
                className="h-10 rounded-full pl-9"
              />
            </form>
            {[
              { to: "/fresh", label: "Fresh market" },
              { to: "/#how", label: "How it works" },
              { to: "/#farmers", label: "For farmers" },
              { to: "/assistant", label: "Ask the AI assistant" },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            {isAuthenticated ? (
              <button
                type="button"
                className="block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-muted"
                onClick={() => {
                  setOpen(false);
                  void signOutAndGo();
                }}
              >
                Sign out
              </button>
            ) : (
              <Button className="mt-2 w-full" onClick={() => toAuth("/buyer")}>
                Sign in or create an account
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
