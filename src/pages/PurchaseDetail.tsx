import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatCurrency";
import { toast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePurchase } from "@/hooks/usePurchase";
import type { PurchaseEstado } from "@/hooks/usePurchases";
import { apiFetch } from "@/utils/api";
import { getCSRFToken } from "@/utils/csrf";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ArrowLeft, Building2, Calendar, Receipt, PackageCheck, Clock } from "lucide-react";

function EstadoBadge({ estado }: { estado: PurchaseEstado }) {
  if (estado === "recibido") {
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-100">Recibido</Badge>;
  }
  if (estado === "parcial") {
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-100">Recibido parcial</Badge>;
  }
  return <Badge className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-300 hover:bg-orange-100"><Clock className="w-3 h-3 mr-1" />Pendiente</Badge>;
}

export default function PurchaseDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: purchase, isLoading, isError } = usePurchase(id ?? "");

  useEffect(() => {
    if (isError) toast({ title: "Error", description: "No se pudo cargar la compra.", variant: "destructive" });
  }, [isError]);

  const receiveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/compras/${id}/recibir/`, {
        method: "POST",
        headers: { "X-CSRFToken": getCSRFToken() },
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? "Error al confirmar recepción");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase", id] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Compra recibida", description: "El stock fue actualizado correctamente." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading || !purchase) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link to="/purchases" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" /> Volver al listado
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Compra #{purchase.id}</h1>
          <EstadoBadge estado={purchase.estado} />
        </div>
      </div>

      {/* Reception CTA for pending purchases */}
      {purchase.estado === "pendiente" && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-orange-200 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-800">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="font-medium text-orange-700 dark:text-orange-300">Esta compra aún no fue recibida.</span>
            <span className="text-orange-600/80 dark:text-orange-400/80 hidden sm:inline">Confirmá la recepción para actualizar el stock.</span>
          </div>
          <ConfirmDialog
            trigger={
              <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0">
                <PackageCheck className="w-3.5 h-3.5" /> Confirmar recepción
              </Button>
            }
            title="Confirmar recepción"
            description={`¿Confirmar que se recibieron los ${purchase.detalles.length} producto${purchase.detalles.length !== 1 ? "s" : ""} de esta compra? El stock se actualizará automáticamente.`}
            confirmLabel="Confirmar recepción"
            onConfirm={() => receiveMutation.mutate()}
          />
        </div>
      )}

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-950/40">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Proveedor</p>
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/60">
                <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 truncate">
              {purchase.proveedor_nombre ?? purchase.proveedor}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800/40">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Fecha</p>
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700/60">
                <Calendar className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              </div>
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{purchase.fecha}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-emerald-50 dark:bg-emerald-950/40">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total</p>
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60">
                <Receipt className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(purchase.total)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Line items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Líneas de compra
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({purchase.detalles.length} producto{purchase.detalles.length !== 1 ? "s" : ""})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b">
            <span className="col-span-5">Producto</span>
            <span className="col-span-2 text-right">Cantidad</span>
            <span className="col-span-2 text-right">Precio unit.</span>
            <span className="col-span-3 text-right">Subtotal</span>
          </div>
          {purchase.detalles.map((detalle, index) => (
            <div
              key={`${detalle.producto}-${index}`}
              className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b last:border-0 hover:bg-muted/20 transition-colors"
            >
              <span className="col-span-5 font-medium">{detalle.producto_nombre ?? detalle.producto}</span>
              <span className="col-span-2 text-right text-muted-foreground">{detalle.cantidad} {detalle.unidad}</span>
              <span className="col-span-2 text-right text-muted-foreground">{formatCurrency(detalle.precio_unitario)}</span>
              <span className="col-span-3 text-right font-semibold">{formatCurrency(detalle.subtotal)}</span>
            </div>
          ))}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-muted/30 text-sm font-semibold">
            <span className="col-span-9">Total</span>
            <span className="col-span-3 text-right text-base font-bold">{formatCurrency(purchase.total)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
