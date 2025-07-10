import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
// If 'button.tsx' exists in the same folder, ensure the file is present.
// Otherwise, update the import path to the correct location, for example:
// Update the path below to the actual location of your Button component
import { Button } from "./button";
import { Menu, X, Package } from "lucide-react";
import { useCurrentUser } from "../../hooks/useCurrentUser";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;
  const { data: user } = useCurrentUser();

  const isAdmin = user?.groups.includes("admin");

  const navItems = [
    ...(isAdmin ? [{ name: "Inventario", path: "/inventory" }] : []),
    ...(user ? [{ name: "Productos", path: "/products" }] : []),
    ...(isAdmin ? [{ name: "Ventas", path: "/sales" }] : []),
    ...(user ? [{ name: "Empleados", path: "/employees"}] : []),
    ...(isAdmin ? [{ name: "Dashboard", path: "/dashboard" }] : []),
  ];

  return (
    <nav className="bg-card/95 backdrop-blur-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Package className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl text-foreground">
              Empanadas De Sabor
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {item.name}
            </Link>
          ))}
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                fetch("/logout/", { credentials: "include" }).then(() => {
                  window.location.href = "/login";
                });
              }}
            >
              Cerrar sesión
            </Button>
          ) : (
            <Link
              to="/login"
              className="px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              Iniciar sesión
            </Link>
          )}
        </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive(item.path)
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              {user ? (
                <button
                  onClick={() => {
                    setIsOpen(false);
                    fetch("/logout/", { credentials: "include" }).then(() => {
                      window.location.href = "/login";
                    });
                  }}
                  className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted w-full text-left"
                >
                  Cerrar sesión
                </button>
              ) : (
                <Link
                  to="/login"
                  className="block px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={() => setIsOpen(false)}
                >
                  Iniciar sesión
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}