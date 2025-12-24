import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { usePurchases } from "@/hooks/usePurchases";
import { useSuppliers } from "@/hooks/useSuppliers";
import { formatCurrency } from "@/utils/formatCurrency";

export default function PurchaseList() {
  const { data: suppliers = [] } = useSuppliers();
  const [params, setParams] = useSearchParams();
  const initialFecha = params.get("fecha") ?? "";
  const initialProveedor = params.get("proveedor") ?? "";

  const [fecha, setFecha] = useState(initialFecha);
  const [proveedor, setProveedor] = useState(initialProveedor);

  const filters = useMemo(
    () => ({
      fecha: fecha || undefined,
      proveedor: proveedor || undefined,
    }),
    [fecha, proveedor]
  );

  const { data: purchases = [], isLoading, isError } = usePurchases(filters);

  useEffect(() => {
    if (isError) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las compras.",
        variant: "destructive",
      });
    }
  }, [isError]);

  const updateSearchParams = (nextFecha: string, nextProveedor: string) => {
    const next = new URLSearchParams();
    if (nextFecha) next.set("fecha", nextFecha);
    if (nextProveedor) next.set("proveedor", nextProveedor);
    setParams(next);
  };

  const handleFilterChange = (nextFecha: string, nextProveedor: string) => {
    setFecha(nextFecha);
    setProveedor(nextProveedor);
    updateSearchParams(nextFecha, nextProveedor);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compras</h1>
          <p className="text-muted-foreground">Listado de compras recientes</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link to="/purchases/new">Registrar compra</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="filter-fecha">Fecha</Label>
            <Input
              id="filter-fecha"
              type="date"
              value={fecha}
              onChange={(e) => handleFilterChange(e.target.value, proveedor)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-proveedor">Proveedor</Label>
            <Select
              value={proveedor}
              onValueChange={(value) => handleFilterChange(fecha, value)}
            >
              <SelectTrigger id="filter-proveedor">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-40" />
      ) : purchases.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No hay compras registradas con los filtros actuales.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {purchases.map((purchase) => (
            <Card key={purchase.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Compra #{purchase.id}</CardTitle>
                  <p className="text-sm text-muted-foreground">{purchase.fecha}</p>
                </div>
                <div className="text-lg font-semibold">{formatCurrency(purchase.total)}</div>
              </CardHeader>
              <CardContent className="grid md:grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Proveedor: </span>
                  {purchase.proveedor_nombre ?? purchase.proveedor}
                </div>
                <div>
                  <span className="text-muted-foreground">Líneas: </span>
                  {purchase.detalles.length}
                </div>
                <div>
                  <Link to={`/purchases/${purchase.id}`} className="text-primary hover:underline">
                    Ver detalle
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}