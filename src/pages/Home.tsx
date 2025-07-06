import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Package, CheckCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary/5 to-background py-12 px-4">
      {/* Encabezado con gradiente */}
      <header className="text-center mb-12 space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold text-primary drop-shadow">
          Empanadas El Dorado
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto border-b border-primary pb-2">
          Panel de Gestión de Inventario
        </p>
      </header>

      {/* Bienvenida con tarjetas */}
      <section className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="shadow-md hover:shadow-xl transition border-l-4 border-primary">
          <CardHeader>
            <CardTitle className="text-xl text-primary">Bienvenido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Accede rápidamente a las funcionalidades principales del sistema de
              gestión. Administra tu inventario de forma segura y eficaz.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg">
                <Link to="/dashboard">Ir al Dashboard</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/inventory">Gestionar Inventario</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md hover:shadow-xl transition border-l-4 border-primary">
          <CardHeader>
            <CardTitle className="text-xl text-primary">Datos del Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground">
              <li>✔ 128 productos registrados</li>
              <li>✔ 35 movimientos este mes</li>
              <li>✔ Stock bajo en 12 productos</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Ticker de inventario */}
      <div className="overflow-hidden bg-primary text-primary-foreground py-2 mb-4 rounded shadow">
        <div className="animate-marquee whitespace-nowrap">
          <span className="mx-4">⚠️ Empanada de atún: solo 5 unidades en stock</span>
          <span className="mx-4">⚠️ Masa integral: reposición pendiente</span>
          <span className="mx-4">📦 Revisión de inventario programada el 10/07</span>
          <span className="mx-4">🆕 Nuevo producto: Empanada vegana registrada</span>
        </div>
      </div>

      <div className="overflow-hidden bg-muted text-foreground py-2 border border-primary/20 rounded shadow">
        <div className="animate-marquee whitespace-nowrap">
          <span className="mx-4">✅ Última sincronización completada hoy a las 14:00</span>
          <span className="mx-4">🔄 Próxima auditoría el 30/07</span>
          <span className="mx-4">📊 Sistema estable con 128 productos activos</span>
        </div>
      </div>

      {/* Footer corporativo */}
      <footer className="text-center text-xs text-muted-foreground mt-auto pt-8 border-t">
        <p>Empanadas El Dorado — Sistema de Gestión v1.0 &copy; 2025</p>
        <p>Soporte: soporte@empanadaseldorado.com | +34 123 456 789</p>
      </footer>
    </div>
  );
}



