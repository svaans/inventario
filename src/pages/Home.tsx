import { Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "../components/ui/button";
import { toast } from "../hooks/use-toast";
import { useCriticalProducts } from "../hooks/useCriticalProducts";
import CriticalProductsTicker from "../components/inventory/CriticalProductsTicker";
import { PackageSearch, LayoutDashboard } from "lucide-react";

export default function Home() {
  const { data: criticalProducts = [], isError } = useCriticalProducts();

  useEffect(() => {
    if (isError) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los productos críticos",
        variant: "destructive",
      });
    }
  }, [isError]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-orange-50 via-white to-yellow-100 px-4 sm:px-6 py-12">
      {/* Hero */}
      <section className="max-w-5xl mx-auto text-center mb-20 bg-orange-100/80 text-foreground rounded-2xl p-10 shadow-xl border border-orange-300">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/logo-inventario.svg"
            alt="Logo del sistema"
            className="w-20 h-20 mb-2"
          />
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight drop-shadow-sm">
            Bienvenido al Sistema de Inventario
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mt-2">
            Control total de productos, stock e ingredientes. Todo en un solo lugar.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Button asChild size="lg" className="px-8 shadow-md hover:shadow-lg transition-all">
              <Link to="/dashboard">
                <LayoutDashboard className="mr-2 h-5 w-5" />
                Acceder al Panel
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="px-8 border-orange-400 text-orange-600 hover:bg-orange-200 hover:text-orange-900 transition-all"
            >
              <Link to="/inventory">
                <PackageSearch className="mr-2 h-5 w-5" />
                Ver Inventario
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Productos críticos */}
      {criticalProducts.length > 0 && (
        <section className="max-w-5xl mx-auto mb-20">
          <CriticalProductsTicker products={criticalProducts} />
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto text-center text-sm text-muted-foreground border-t pt-6">
        <p className="mb-1 font-medium">Empanadas De Sabor — Sistema de Gestión v1.0 &copy; 2025</p>
        <p>
          Soporte:{" "}
          <a className="underline" href="mailto:soporte@empanadaseldorado.com">
            soporte@empanadasdesabor.com
          </a>{" "}
          | +34 123 456 789
        </p>
      </footer>
    </div>
  );
}








