import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Product } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";

export interface PurchaseItem {
  producto?: number;
  cantidad: number;
  unidad: string;
  precio_unitario: number;
}

interface PurchaseItemsTableProps {
  items: PurchaseItem[];
  products: Product[];
  onChange: (index: number, item: PurchaseItem) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export function PurchaseItemsTable({ items, products, onChange, onAdd, onRemove }: PurchaseItemsTableProps) {
  const updateItem = (index: number, partial: Partial<PurchaseItem>) => {
    onChange(index, { ...items[index], ...partial });
  };

  const getUnit = (item: PurchaseItem) => {
    if (item.unidad) return item.unidad;
    const product = products.find((p) => p.id === item.producto);
    return product?.unit ?? "";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base">Líneas de compra</Label>
        <Button type="button" size="sm" onClick={onAdd} className="gap-2">
          <Plus className="h-4 w-4" /> Agregar producto
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Cantidad</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Precio unitario</TableHead>
              <TableHead>Subtotal</TableHead>
              <TableHead className="w-[80px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const subtotal = item.cantidad * item.precio_unitario;
              const unit = getUnit(item);
              return (
                <TableRow key={index}>
                  <TableCell className="min-w-[180px]">
                    <Select
                      value={item.producto ? String(item.producto) : ""}
                      onValueChange={(value) => {
                        const product = products.find((p) => p.id === Number(value));
                        updateItem(index, {
                          producto: Number(value),
                          unidad: product?.unit ?? unit,
                          precio_unitario: item.precio_unitario || product?.cost || 0,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar producto" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={String(product.id)}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.cantidad || ""}
                      onChange={(e) => updateItem(index, { cantidad: parseFloat(e.target.value) || 0 })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      placeholder="Unidad"
                      value={item.unidad || unit}
                      onChange={(e) => updateItem(index, { unidad: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.precio_unitario || ""}
                      onChange={(e) =>
                        updateItem(index, { precio_unitario: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </TableCell>
                  <TableCell className={cn(subtotal <= 0 && "text-destructive font-medium")}>
                    {formatCurrency(Number.isFinite(subtotal) ? subtotal : 0)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemove(index)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}