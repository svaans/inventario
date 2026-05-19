import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useStockAdjustment } from "../../hooks/useStockAdjustment";
import { toast } from "../../hooks/use-toast";
import { formatCurrency } from "../../utils/formatCurrency";
import type { Product } from "../../hooks/useProducts";

const MOTIVOS = [
  "Conteo físico",
  "Merma",
  "Rotura o daño",
  "Vencimiento",
  "Error de registro",
  "Donación",
  "Otro",
];

interface Props {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function StockAdjustmentDialog({ product, open, onOpenChange, onSuccess }: Props) {
  const [cantidadNueva, setCantidadNueva] = useState(String(product.stock));
  const [motivo, setMotivo] = useState("");
  const [motivoCustom, setMotivoCustom] = useState("");
  const adjustment = useStockAdjustment();

  const stockActual = product.stock;
  const nueva = parseFloat(cantidadNueva) || 0;
  const diferencia = nueva - stockActual;
  const motivoFinal = motivo === "Otro" ? motivoCustom : motivo;

  const handleSubmit = async () => {
    if (!motivoFinal.trim()) {
      toast({ title: "Ingresa un motivo", variant: "destructive" });
      return;
    }
    if (nueva < 0) {
      toast({ title: "La cantidad no puede ser negativa", variant: "destructive" });
      return;
    }
    try {
      await adjustment.mutateAsync({ producto: product.id, cantidad_nueva: nueva, motivo: motivoFinal });
      toast({ title: "Ajuste registrado", description: `Stock de "${product.name}" actualizado a ${nueva} ${product.unit}.` });
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast({ title: "Error al ajustar", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Ajuste de stock</DialogTitle>
          <DialogDescription>{product.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Current stock info */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Stock actual</p>
              <p className="text-lg font-bold">{stockActual}</p>
              <p className="text-xs text-muted-foreground">{product.unit}</p>
            </div>
            <div className={`rounded-lg p-3 ${diferencia > 0 ? "bg-emerald-50 dark:bg-emerald-950/40" : diferencia < 0 ? "bg-red-50 dark:bg-red-950/40" : "bg-muted/50"}`}>
              <p className="text-xs text-muted-foreground mb-1">Diferencia</p>
              <p className={`text-lg font-bold ${diferencia > 0 ? "text-emerald-600" : diferencia < 0 ? "text-red-600" : ""}`}>
                {diferencia > 0 ? "+" : ""}{diferencia !== 0 ? diferencia.toFixed(2) : "–"}
              </p>
              <p className="text-xs text-muted-foreground">{product.unit}</p>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground mb-1">Stock nuevo</p>
              <p className="text-lg font-bold">{isNaN(nueva) ? "–" : nueva}</p>
              <p className="text-xs text-muted-foreground">{product.unit}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cantidad-nueva">Nueva cantidad ({product.unit})</Label>
            <Input
              id="cantidad-nueva"
              type="number"
              min="0"
              step="0.01"
              value={cantidadNueva}
              onChange={(e) => setCantidadNueva(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Motivo</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar motivo…" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {motivo === "Otro" && (
            <div className="space-y-1.5">
              <Label htmlFor="motivo-custom">Especificar motivo</Label>
              <Input
                id="motivo-custom"
                placeholder="Describe el motivo…"
                value={motivoCustom}
                onChange={(e) => setMotivoCustom(e.target.value)}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              onClick={handleSubmit}
              disabled={adjustment.isPending || !motivo || nueva === stockActual}
            >
              {adjustment.isPending ? "Guardando…" : "Confirmar ajuste"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
