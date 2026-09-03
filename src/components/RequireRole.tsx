import { useAuth } from "@/hooks/use-auth";
import type { Role } from "@/convex/schema";
import { roleHome } from "@/lib/role";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

/**
 * Gate for authenticated, onboarded workspaces.
 * - Not signed in          → /auth with a returnTo back here.
 * - No role yet            → /welcome (onboarding) with a returnTo back here.
 * - Wrong role for the app → that role's home dashboard.
 */
export function RequireRole({
  roles,
  children,
}: {
  roles?: Role[];
  children: ReactNode;
}) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/auth?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  if (!user?.role) {
    return (
      <Navigate to={`/welcome?returnTo=${encodeURIComponent(returnTo)}`} replace />
    );
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to={roleHome(user.role)} replace />;
  }

  return children;
}
