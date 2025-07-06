import { useSales } from "../hooks/useSales";
import { useProducts } from "../hooks/useProducts";
import { useCreateSale } from "../hooks/useCreateSale";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { toast } from "../hooks/use-toast";

export default function Sales() {
  const { data: sales = [], refetch } = useSales();
  const { data: products = [] } = useProducts();
  const createSale = useCreateSale();

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [selectedProduct, setSelectedProduct] = useState<number | "">("");
  const [quantity, setQuantity] = useState(1);
  const [items, setItems] = useState<{id:number; name:string; price:number; quantity:number;}[]>([]);

  const addItem = () => {
    if (!selectedProduct) return;
    const product = products.find(p => p.id === Number(selectedProduct));
    if (!product) return;
    setItems([...items, { id: product.id, name: product.name, price: product.price, quantity }]);
    setSelectedProduct("");
    setQuantity(1);
  };

  const removeItem = (id:number) => setItems(items.filter(i => i.id !== id));

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const handleSubmit = async () => {
    if (items.length === 0) return;
    try {
      await createSale.mutateAsync({
        fecha: date,
        detalles: items.map(i => ({ producto: i.id, cantidad: i.quantity, precio_unitario: i.price })),
      });
      toast({ title: "Venta registrada" });
      setItems([]);
      setOpen(false);
      refetch();
    } catch {
      toast({ title: "Error", description: "No se pudo registrar la venta", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Ventas</h1>
        <p className="text-muted-foreground">Listado de ventas registradas</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="mt-4 bg-primary hover:bg-primary/90">Registrar Venta</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Nueva Venta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm" htmlFor="date">Fecha</label>
                <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-sm" htmlFor="product">Producto</label>
                  <Select value={selectedProduct} onValueChange={(v) => setSelectedProduct(v)}>
                    <SelectTrigger id="product">
                      <SelectValue placeholder="Selecciona producto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <label className="text-sm" htmlFor="qty">Cant.</label>
                  <Input id="qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)} />
                </div>
                <Button onClick={addItem}>Agregar</Button>
              </div>
              {items.length > 0 && (
                <div className="border rounded-md p-2 space-y-2 max-h-52 overflow-y-auto">
                  {items.map(item => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <span>{item.name} x{item.quantity}</span>
                      <div className="flex items-center gap-2">
                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                        <Button size="sm" variant="ghost" onClick={() => removeItem(item.id)}>Eliminar</Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              )}
              <div className="text-right">
                <Button onClick={handleSubmit} disabled={createSale.isPending || items.length===0}>Guardar Venta</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
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