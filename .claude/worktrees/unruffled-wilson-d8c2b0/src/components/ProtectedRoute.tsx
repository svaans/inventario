import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useCurrentUser } from "../hooks/useCurrentUser";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const { data: user, isLoading, isError } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
        Verificando sesión...
      </div>
    );
  }

  if (isError || !user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles) {
    const isAdmin = user.is_superuser || user.groups.includes("admin");
    const hasRole = allowedRoles.some((role) => user.groups.includes(role));
    if (!isAdmin && !hasRole) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}