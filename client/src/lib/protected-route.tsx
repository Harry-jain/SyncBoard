import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteComponentProps } from "wouter";

type ProtectedRouteProps = {
  path: string;
  component: React.ComponentType<any>;
  roles?: string[];
};

export function ProtectedRoute({
  path,
  component: Component,
  roles,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {(params) => {
        // Show loading state
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        // Not logged in, redirect to auth page
        if (!user) {
          return <Redirect to="/auth" />;
        }

        // Check role-based access if required
        if (roles && !roles.includes(user.role || "")) {
          return (
            <div className="flex flex-col items-center justify-center min-h-screen">
              <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
              <p className="text-gray-600 mb-8">
                You don't have permission to access this page.
              </p>
              <Redirect to="/" />
            </div>
          );
        }

        // All good, render the component with route params
        return <Component {...params} />;
      }}
    </Route>
  );
}