import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatCurrency";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { usePurchase } from "@/hooks/usePurchase";

export default function PurchaseDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: purchase, isLoading, isError } = usePurchase(id ?? "");

  useEffect(() => {
    if (isError) {
      toast({
        title: "Error",
        description: "No se pudo cargar la compra.",
        variant: "destructive",
      });
    }
  }, [isError]);

  if (isLoading || !purchase) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Compra #{purchase.id}</p>
          <h1 className="text-3xl font-bold">Detalle de compra</h1>
        </div>
        <Link to="/purchases" className="text-primary hover:underline">
          Volver al listado
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Proveedor:</span>{" "}
            <Badge variant="outline">{purchase.proveedor_nombre ?? purchase.proveedor}</Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Fecha:</span> {purchase.fecha}
          </div>
          <div>
            <span className="text-muted-foreground">Total:</span>{" "}
            <strong>{formatCurrency(purchase.total)}</strong>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Líneas de compra</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {purchase.detalles.map((detalle, index) => (
            <div
              key={`${detalle.producto}-${index}`}
              className="grid md:grid-cols-4 gap-3 rounded-md border p-3 text-sm"
            >
              <div>
                <span className="text-muted-foreground">Producto:</span>{" "}
                {detalle.producto_nombre ?? detalle.producto}
              </div>
              <div>
                <span className="text-muted-foreground">Cantidad:</span> {detalle.cantidad}{" "}
                {detalle.unidad}
              </div>
              <div>
                <span className="text-muted-foreground">Precio unitario:</span>{" "}
                {formatCurrency(detalle.precio_unitario)}
              </div>
              <div>
                <span className="text-muted-foreground">Subtotal:</span>{" "}
                <strong>{formatCurrency(detalle.subtotal)}</strong>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}