import { Link } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "../hooks/use-toast";
import { useCriticalProducts } from "../hooks/useCriticalProducts";
import CriticalProductsTicker from "../components/inventory/CriticalProductsTicker";
import { LayoutDashboard, PackageSearch, ArrowRight, ShoppingCart, TrendingUp, Package } from "lucide-react";
import DailyActivityChart from "../components/DailyActivityChart";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

const features = [
  {
    icon: Package,
    title: "Inventario",
    description: "Control de stock en tiempo real con alertas de productos críticos.",
  },
  {
    icon: ShoppingCart,
    title: "Ventas & Compras",
    description: "Registro de ventas, recepciones y flujo completo de pedidos.",
  },
  {
    icon: TrendingUp,
    title: "Finanzas",
    description: "Dashboard financiero, evolución de negocio y tendencias mensuales.",
  },
];

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
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/6 blur-3xl rounded-full" />
        </div>
        <div className="relative max-w-5xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
            <img
              src="/logo-inventario.svg"
              alt="Logo del sistema"
              className="w-11 h-11"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Sistema de{" "}
            <span className="text-primary">Gestión</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto mb-10">
            Control total de productos, stock, ventas e ingredientes. Todo en un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all shadow-golden text-sm"
            >
              <LayoutDashboard className="h-4 w-4" />
              Acceder al Panel
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/inventory"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-secondary-foreground font-medium rounded-xl hover:bg-secondary/80 border border-border transition-all text-sm"
            >
              <PackageSearch className="h-4 w-4" />
              Ver Inventario
            </Link>
          </div>
        </div>
      </section>

      {/* Critical products ticker */}
      {criticalProducts.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 mb-12">
          <CriticalProductsTicker products={criticalProducts} />
        </section>
      )}

      {/* Feature cards */}
      <section className="max-w-5xl mx-auto px-6 mb-16">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="bg-card border border-border rounded-xl p-5">
              <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Daily activity */}
      <section className="max-w-5xl mx-auto px-6 mb-20">
        <Card>
          <CardHeader>
            <CardTitle>Actividad del Día</CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            <DailyActivityChart />
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        <p className="font-medium mb-1">Empanadas De Sabor — Sistema de Gestión v1.0 &copy; 2025</p>
        <p>
          Soporte:{" "}
          <a className="text-primary hover:underline" href="mailto:soporte@empanadasdesabor.com">
            soporte@empanadasdesabor.com
          </a>
        </p>
      </footer>
    </div>
  );
}
