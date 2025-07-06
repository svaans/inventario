import { useSales } from "../hooks/useSales";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export default function Sales() {
  const { data: sales = [] } = useSales();

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Ventas</h1>
        <p className="text-muted-foreground">Listado de ventas registradas</p>
      </div>
      <div className="space-y-4">
        {sales.map((sale) => (
          <Card key={sale.id} className="hover:shadow-warm transition-shadow duration-300">
            <CardHeader>
              <CardTitle>
                Venta #{sale.id} - {sale.fecha}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Cliente:</span> {sale.cliente || "N/A"}
              </div>
              <div>
                <span className="text-muted-foreground">Usuario:</span> {sale.usuario}
              </div>
              <div>
                <span className="text-muted-foreground">Total:</span> ${sale.total.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {sales.length === 0 && (
        <p className="text-center text-muted-foreground">No hay ventas registradas.</p>
      )}
    </div>
  );
}