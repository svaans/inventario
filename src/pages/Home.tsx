import { Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "../components/ui/button";
import { toast } from "../hooks/use-toast";
import { useCriticalProducts } from "../hooks/useCriticalProducts";
import CriticalProductsTicker from "../components/inventory/CriticalProductsTicker";

export default function Home() {
  const {
    data: criticalProducts = [],
    isError,
  } = useCriticalProducts();

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
    <div className="min-h-screen flex flex-col bg-panel-gradient px-6 py-12">
      {/* Hero destacado */}
      <section className="max-w-5xl mx-auto text-center mb-20 bg-gradient-hero text-background rounded-2xl p-10 shadow-warm border border-border backdrop-blur-md">
        <h1 className="text-5xl font-extrabold tracking-tight leading-tight drop-shadow-sm">
          Bienvenido al Sistema de Inventario
        </h1>
        <p className="text-background/80 text-lg mt-4 max-w-2xl mx-auto">
          Control total de productos, stock y movimientos. Tu inventario al alcance de un clic.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild size="lg" className="px-8 shadow-md hover:shadow-lg transition-all">
            <Link to="/dashboard">Acceder al Panel</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="px-8 border-white/30 hover:bg-white/10 hover:text-white transition-all"
          >
            <Link to="/inventory">Ver Inventario</Link>
          </Button>
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
        <p className="mb-1">Empanadas De Sabor — Sistema de Gestión v1.0 &copy; 2025</p>
        <p>Soporte: soporte@empanadaseldorado.com | +34 123 456 789</p>
      </footer>
    </div>
  );
}







