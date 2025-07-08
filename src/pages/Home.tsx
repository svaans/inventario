import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { useCriticalProducts } from "../hooks/useCriticalProducts";
import CriticalProductsTicker from "../components/inventory/CriticalProductsTicker";

export default function Home() {
  const { data: criticalProducts = [] } = useCriticalProducts();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-100 via-white to-gray-50 px-6 py-12">
      {/* Hero */}
      <section className="max-w-6xl mx-auto text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tight leading-tight">
          Bienvenido a tu Sistema de Inventario
        </h1>
        <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
          Gestiona tu inventario de forma clara, precisa y profesional. Todo lo que necesitas para el control total está a un clic.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <Button asChild size="lg" className="px-8">
            <Link to="/dashboard">Acceder al Panel</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="px-8">
            <Link to="/inventory">Ver Inventario</Link>
          </Button>
        </div>
      </section>

      {/* Productos críticos */}
      {criticalProducts.length > 0 && (
        <section className="max-w-5xl mx-auto mb-16">
          <CriticalProductsTicker products={criticalProducts} />
        </section>
      )}

      {/* Footer */}
      <footer className="mt-auto text-center text-sm text-muted-foreground border-t pt-6">
        <p className="mb-1">Empanadas El Dorado — Sistema de Gestión v1.0 &copy; 2025</p>
        <p>Soporte: soporte@empanadaseldorado.com | +34 123 456 789</p>
      </footer>
    </div>
  );
}





