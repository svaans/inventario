import { useState } from "react";
import { useProducts } from "../../hooks/useProducts";
import { useCreateSale } from "../../hooks/useCreateSale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "../ui/sheet";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { toast } from "../../hooks/use-toast";
import { formatCurrency } from "../../utils/formatCurrency";
import type { Product } from "../../hooks/useProducts";

interface Item extends Product {
  quantity: number;
}

interface RegistrarVentaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaleCreated?: () => Promise<void> | void;
}

export default function RegistrarVentaForm({
  open,
  onOpenChange,
  onSaleCreated,
}: RegistrarVentaFormProps) {
  const { data: products = [] } = useProducts();
  const createSale = useCreateSale();
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const addProduct = (p: Product) => {
    setItems((prev) => {
      if (prev.find((i) => i.id === p.id)) return prev;
      return [...prev, { ...p, quantity: 1 }];
    });
    setSearch("");
    setSearchOpen(false);
  };

  const updateQty = (id: number, qty: number) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i))
    );
  };

  const removeItem = (id: number) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const hasStockError = items.some((i) => i.quantity > i.stock);

  const handleSubmit = async () => {
    if (items.length === 0 || hasStockError) return;
    try {
      await createSale.mutateAsync({
        fecha: date,
        detalles: items.map((i) => ({
          producto: i.id,
          cantidad: i.quantity,
          precio_unitario: i.price,
        })),
      });
      toast({ title: "Venta registrada" });
      setItems([]);
      setSearch("");
      onOpenChange(false);
      if (onSaleCreated) await onSaleCreated();
    } catch {
      toast({
        title: "Error",
        description: "No se pudo registrar la venta",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setItems([]);
    setSearch("");
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] p-4 flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>Registrar Venta</SheetTitle>
        </SheetHeader>
        <div className="grid gap-4 flex-1 overflow-y-auto">
          <div className="grid gap-2">
            <label htmlFor="date" className="text-sm">
              Fecha
            </label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Input
                  placeholder="Buscar producto"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                />
              </PopoverTrigger>
              <PopoverContent className="p-0">
                {filtered.length === 0 && (
                  <p className="p-2 text-sm text-muted-foreground">
                    Sin resultados
                  </p>
                )}
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted"
                    onClick={() => addProduct(p)}
                  >
                    <div className="flex justify-between">
                      <span>{p.name}</span>
                      <span>{formatCurrency(p.price)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Stock: {p.stock}
                    </p>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
          {items.length > 0 && (
            <div className="grid gap-2">
              {items.map((item) => (
                <Card key={item.id} className="p-4 flex justify-between">
                  <div>
                    <p className="text-lg font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.price)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={item.stock}
                      value={item.quantity}
                      onChange={(e) =>
                        updateQty(item.id, parseInt(e.target.value) || 1)
                      }
                      className="w-20"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeItem(item.id)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
          {items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.name}</TableCell>
                    <TableCell className="text-right">{i.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(i.price * i.quantity)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={2} className="font-semibold text-right">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
          {hasStockError && (
            <p className="text-sm text-destructive">
              La cantidad supera el stock disponible.
            </p>
          )}
        </div>
        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} type="button">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={items.length === 0 || hasStockError || createSale.isPending}
          >
            Registrar Venta
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}