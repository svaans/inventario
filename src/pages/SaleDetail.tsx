import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { apiFetch } from "@/utils/api";
import { getCSRFToken } from "@/utils/csrf";
import { formatCurrency } from "@/utils/formatCurrency";
import { ArrowLeft, Users, Calendar, Receipt, RotateCcw, Minus, Plus } from "lucide-react";

interface SaleDetailLine {
  producto: number;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

interface SaleDetailData {
  id: number;
  fecha: string;
  total: number;
  cliente: string | null;
  cliente_id: number | null;
  usuario: string | null;
  detalles: SaleDetailLine[];
}

const MOTIVOS = [
  "Producto defectuoso",
  "Producto incorrecto",
  "No cumplió expectativas",
  "Error en pedido",
  "Otro",
];

function ReturnForm({ sale, onClose }: { sale: SaleDetailData; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [customMotivo, setCustomMotivo] = useState("");
  const [reembolso, setReembolso] = useState(false);
  const [quantities, setQuantities] = useState<Record<number, number>>(
    Object.fromEntries(sale.detalles.map((d) => [d.producto, 0]))
  );

  const setQty = (producto: number, val: number, max: number) =>
    setQuantities((q) => ({ ...q, [producto]: Math.max(0, Math.min(max, val)) }));

  const totalItems = Object.values(quantities).reduce((s, v) => s + v, 0);

  const mutation = useMutation({
    mutationFn: async () => {
      const items = Object.entries(quantities)
        .filter(([, qty]) => qty > 0)
        .map(([producto, cantidad]) => ({ producto: Number(producto), cantidad }));
      const res = await apiFetch(`/api/ventas/${sale.id}/devolucion/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRFToken() },
        credentials: "include",
        body: JSON.stringify({
          items,
          motivo: motivo === "Otro" ? customMotivo || "Otro" : motivo,
          reembolso,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? "Error al registrar la devolución");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["sale", sale.id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Devolución registrada", description: `${data.count} producto${data.count !== 1 ? "s" : ""} devuelto${data.count !== 1 ? "s" : ""} y stock actualizado.` });
      onClose();
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4 py-2">
      {/* Product quantities */}
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Productos a devolver</p>
        <div className="space-y-2">
          {sale.detalles.map((line) => (
            <div key={line.producto} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{line.producto_nombre}</p>
                <p className="text-xs text-muted-foreground">Comprado: {line.cantidad} u.</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="icon"
                  variant="outline"
                  className="w-7 h-7"
                  onClick={() => setQty(line.producto, (quantities[line.producto] ?? 0) - 1, line.cantidad)}
                  disabled={(quantities[line.producto] ?? 0) === 0}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <Input
                  className="w-14 h-7 text-center text-sm px-1"
                  type="number"
                  min={0}
                  max={line.cantidad}
                  value={quantities[line.producto] ?? 0}
                  onChange={(e) => setQty(line.producto, Number(e.target.value), line.cantidad)}
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="w-7 h-7"
                  onClick={() => setQty(line.producto, (quantities[line.producto] ?? 0) + 1, line.cantidad)}
                  disabled={(quantities[line.producto] ?? 0) >= line.cantidad}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Motivo */}
      <div className="grid gap-1.5">
        <Label>Motivo</Label>
        <Select value={motivo} onValueChange={setMotivo}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MOTIVOS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {motivo === "Otro" && (
          <Input
            placeholder="Describa el motivo…"
            value={customMotivo}
            onChange={(e) => setCustomMotivo(e.target.value)}
          />
        )}
      </div>

      {/* Reembolso */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          className="w-4 h-4 rounded"
          checked={reembolso}
          onChange={(e) => setReembolso(e.target.checked)}
        />
        <span className="text-sm">Incluir reembolso al cliente</span>
      </label>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || totalItems === 0 || (motivo === "Otro" && !customMotivo.trim())}
          className="gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {mutation.isPending ? "Registrando…" : `Registrar devolución (${totalItems})`}
        </Button>
      </div>
    </div>
  );
}

export default function SaleDetail() {
  const { id } = useParams<{ id: string }>();
  const [returnOpen, setReturnOpen] = useState(false);

  const { data: sale, isLoading, isError } = useQuery<SaleDetailData>({
    queryKey: ["sale", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/ventas/${id}/`, { credentials: "include" });
      if (!res.ok) throw new Error("No se pudo cargar la venta");
      return res.json();
    },
    enabled: Boolean(id),
  });

  if (isLoading || !sale) {
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

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <p className="text-destructive">No se pudo cargar la venta.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link to="/sales" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" /> Volver al listado
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Venta #{sale.id}</h1>
          <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Registrar devolución
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]" aria-describedby="return-desc">
              <DialogHeader>
                <DialogTitle>Registrar devolución</DialogTitle>
                <DialogDescription id="return-desc">
                  Seleccioná los productos y cantidades a devolver. El stock se actualizará automáticamente.
                </DialogDescription>
              </DialogHeader>
              <ReturnForm sale={sale} onClose={() => setReturnOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-0 shadow-sm bg-purple-50 dark:bg-purple-950/40">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cliente</p>
              <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/60">
                <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 truncate">
              {sale.cliente ?? "Sin cliente"}
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
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{sale.fecha}</p>
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
            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(sale.total)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Line items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Productos vendidos
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({sale.detalles.length} ítem{sale.detalles.length !== 1 ? "s" : ""})
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
          {sale.detalles.map((line, i) => (
            <div
              key={`${line.producto}-${i}`}
              className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b last:border-0 hover:bg-muted/20 transition-colors"
            >
              <span className="col-span-5 font-medium">{line.producto_nombre}</span>
              <span className="col-span-2 text-right text-muted-foreground">{line.cantidad}</span>
              <span className="col-span-2 text-right text-muted-foreground">{formatCurrency(line.precio_unitario)}</span>
              <span className="col-span-3 text-right font-semibold">{formatCurrency(line.subtotal)}</span>
            </div>
          ))}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-muted/30 text-sm font-semibold">
            <span className="col-span-9">Total</span>
            <span className="col-span-3 text-right text-base font-bold">{formatCurrency(sale.total)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
