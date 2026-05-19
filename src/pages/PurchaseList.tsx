import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { usePurchases } from "@/hooks/usePurchases";
import type { PurchaseEstado } from "@/hooks/usePurchases";
import { useSuppliers } from "@/hooks/useSuppliers";
import { formatCurrency } from "@/utils/formatCurrency";

function EstadoBadge({ estado }: { estado: PurchaseEstado }) {
  if (estado === "recibido") {
    return <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100">Recibido</Badge>;
  }
  if (estado === "parcial") {
    return <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-100">Parcial</Badge>;
  }
  return <Badge className="text-xs bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 hover:bg-orange-100">Pendiente</Badge>;
}

export default function PurchaseList() {
  const { data: suppliers = [] } = useSuppliers();
  const [params, setParams] = useSearchParams();
  const initialFecha = params.get("fecha") ?? "";
  const initialProveedor = params.get("proveedor") || "all";

  const [fecha, setFecha] = useState(initialFecha);
  const [proveedor, setProveedor] = useState(initialProveedor);

  const filters = useMemo(() => {
    const proveedorFilter = proveedor === "all" ? undefined : proveedor;
    return {
      fecha: fecha || undefined,
      proveedor: proveedorFilter,
    };
  }, [fecha, proveedor]);

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
    if (nextProveedor && nextProveedor !== "all") next.set("proveedor", nextProveedor);
    setParams(next);
  };

  const handleFilterChange = (nextFecha: string, nextProveedor: string) => {
    const normalizedProveedor = nextProveedor || "all";

    setFecha(nextFecha);
    setProveedor(normalizedProveedor);
    updateSearchParams(nextFecha, normalizedProveedor);
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
                <SelectItem value="all">Todos</SelectItem>
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
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : purchases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          </div>
          <h3 className="text-base font-semibold mb-1">Sin compras registradas</h3>
          <p className="text-sm text-muted-foreground">No hay compras con los filtros actuales.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {purchases.map((purchase) => (
            <Link
              key={purchase.id}
              to={`/purchases/${purchase.id}`}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/40 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">Compra #{purchase.id}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <span>{purchase.fecha}</span>
                    <span>{purchase.proveedor_nombre ?? purchase.proveedor}</span>
                    <span>{purchase.detalles.length} línea{purchase.detalles.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <EstadoBadge estado={purchase.estado} />
                <span className="font-semibold text-sm">{formatCurrency(purchase.total)}</span>
                <svg className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}