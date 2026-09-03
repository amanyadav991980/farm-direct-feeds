import { useAuth } from "@/hooks/use-auth";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowRight,
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  ShoppingBasket,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

function roleHome(role?: string | null): string {
  if (role === "farmer") return "/farmer";
  if (role === "admin") return "/admin";
  return "/buyer";
}

export function SiteHeader() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const cartCount = useQuery(api.cart.cartCount);

  const toAuth = (returnTo: string) =>
    navigate(`/auth?returnTo=${encodeURIComponent(returnTo)}`);

  const signOutAndGo = async () => {
    await signOut();
    navigate("/");
  };

  const links = [
    { to: "/fresh", label: "fresh-market", hint: "buy fresh produce" },
    { to: "/#how", label: "how-it-works", hint: "farm to basket" },
    { to: "/#pricing", label: "transparent-pricing", hint: "no hidden fees" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="group flex items-center gap-2">
            <span className="flex size-7 items-center justify-center border border-primary bg-primary text-[13px] text-primary-foreground">
              fd
            </span>
            <span className="font-mono text-sm font-bold tracking-tight">
              farmdirect<span className="text-primary">.sh</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className="rounded-none border border-transparent px-2.5 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-border hover:bg-card hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/#farmers"
              className="rounded-none border border-transparent px-2.5 py-1.5 font-mono text-xs text-muted-foreground transition-colors hover:border-border hover:bg-card hover:text-foreground"
            >
              farmers
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {isLoading ? null : isAuthenticated ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="relative hidden gap-1.5 font-mono text-xs sm:inline-flex"
                onClick={() =>
                  navigate(user?.role === "farmer" ? "/farmer" : "/buyer")
                }
              >
                <LayoutDashboard className="size-3.5" />
                {user?.role ?? "dashboard"}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="relative"
                onClick={() => navigate("/notifications")}
                aria-label="Notifications"
              >
                <Bell className="size-4" />
              </Button>
              <Button
                variant="outline"
                className="relative font-mono text-xs"
                onClick={() => navigate("/cart")}
                aria-label="Cart"
              >
                <ShoppingBasket className="size-4" />
                <span className="hidden sm:inline">cart</span>
                {!!cartCount && (
                  <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary font-mono text-[9px] font-bold text-primary-foreground">
                    {cartCount}
                  </span>
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 font-mono text-xs">
                    <span className="max-w-24 truncate">{user?.name ?? "me"}</span>
                    <ChevronDown className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel className="font-mono text-xs">
                    {user?.name ?? "Guest"}
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => navigate(roleHome(user?.role))}
                  >
                    Open dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={signOutAndGo}
                  >
                    <LogOut className="mr-2 size-3.5" /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden font-mono text-xs sm:inline-flex"
                onClick={() => toAuth("/buyer")}
              >
                buyer login
              </Button>
              <Button
                size="sm"
                className="gap-1.5 font-mono text-xs"
                onClick={() => toAuth(location.pathname === "/" ? "/buyer" : location.pathname)}
              >
                sign in <ArrowRight className="size-3.5" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </div>
      {open && (
        <div className="border-t border-border bg-card px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className="px-2 py-2 font-mono text-sm"
                onClick={() => setOpen(false)}
              >
                $ {l.label}
              </Link>
            ))}
            <Link
              to="/#farmers"
              className="px-2 py-2 font-mono text-sm"
              onClick={() => setOpen(false)}
            >
              $ farmers
            </Link>
            {isAuthenticated && (
              <button
                type="button"
                className="px-2 py-2 text-left font-mono text-sm text-destructive"
                onClick={() => {
                  setOpen(false);
                  void signOutAndGo();
                }}
              >
                $ sign-out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
