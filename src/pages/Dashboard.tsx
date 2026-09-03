import { useAuth } from "@/hooks/use-auth";
import { roleHome } from "@/lib/role";
import { Loader2 } from "lucide-react";
import { Navigate, useLocation } from "react-router";

/**
 * Legacy /dashboard entry point. Users without a role go through onboarding;
 * everyone else is routed to their role's workspace home.
 */
export default function Dashboard() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  if (!user?.role) {
    return <Navigate to="/welcome?returnTo=%2Fdashboard" replace />;
  }

  return <Navigate to={roleHome(user.role)} replace />;
}
