import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreatePurchase } from "@/hooks/useCreatePurchase";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useProducts } from "@/hooks/useProducts";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/formatCurrency";
import { PurchaseItemsTable, type PurchaseItem } from "./PurchaseItemsTable";
import { Loader2, Send } from "lucide-react";

const SUPPLIER_API_URL = import.meta.env.VITE_SUPPLIER_API_URL || import.meta.env.SUPPLIER_API_URL;
const SUPPLIER_API_TOKEN = import.meta.env.VITE_SUPPLIER_API_TOKEN || import.meta.env.SUPPLIER_API_TOKEN;

export function PurchaseForm() {
  const navigate = useNavigate();
  const { data: suppliers = [], isLoading: loadingSuppliers, isError: suppliersError } = useSuppliers();
  const { data: products = [], isLoading: loadingProducts, isError: productsError } = useProducts();
  const createPurchase = useCreatePurchase();

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [fecha, setFecha] = useState(today);
  const [proveedor, setProveedor] = useState<number | undefined>(undefined);
  const [items, setItems] = useState<PurchaseItem[]>([{ cantidad: 0, precio_unitario: 0, unidad: "", producto: undefined }]);

  useEffect(() => {
    if (suppliersError) {
      toast({ title: "Error", description: "No se pudo cargar la lista de proveedores.", variant: "destructive" });
    }
  }, [suppliersError]);

  useEffect(() => {
    if (productsError) {
      toast({ title: "Error", description: "No se pudo cargar la lista de productos.", variant: "destructive" });
    }
  }, [productsError]);

  const handleAddItem = () => {
    setItems((prev) => [...prev, { cantidad: 0, precio_unitario: 0, unidad: "", producto: undefined }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChangeItem = (index: number, item: PurchaseItem) => {
    setItems((prev) => prev.map((row, i) => (i === index ? item : row)));
  };

  const total = items.reduce((sum, item) => sum + (item.cantidad || 0) * (item.precio_unitario || 0), 0);

  const validate = () => {
    if (!proveedor) {
      toast({ title: "Proveedor requerido", description: "Selecciona un proveedor antes de registrar la compra.", variant: "destructive" });
      return false;
    }
    if (!items.length) {
      toast({ title: "Sin líneas", description: "Agrega al menos un producto a la compra.", variant: "destructive" });
      return false;
    }
    const hasInvalid = items.some((item) => !item.producto || item.cantidad <= 0 || item.precio_unitario <= 0);
    if (hasInvalid) {
      toast({
        title: "Datos incompletos",
        description: "Cada línea debe tener producto, cantidad positiva y precio unitario positivo.",
        variant: "destructive",
      });
      return false;
    }
    if (total <= 0) {
      toast({
        title: "Total no válido",
        description: "El total debe ser mayor que cero.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const payload = {
        proveedor: Number(proveedor),
        fecha,
        detalles: items.map((item) => ({
          producto: Number(item.producto),
          cantidad: item.cantidad,
          unidad: item.unidad || products.find((p) => p.id === item.producto)?.unit || "",
          precio_unitario: item.precio_unitario,
        })),
        total,
      };
      const result = await createPurchase.mutateAsync(payload);
      toast({ title: "Compra registrada", description: `Compra #${result.id} creada correctamente.` });
      navigate("/purchases");
    } catch (err) {
      console.error(err);
      toast({
        title: "Error al registrar",
        description: err instanceof Error ? err.message : "No se pudo registrar la compra.",
        variant: "destructive",
      });
    }
  };

  const handleSendToSupplier = async () => {
    if (!validate()) return;
    if (!SUPPLIER_API_URL || !SUPPLIER_API_TOKEN) {
      toast({ title: "Configuración faltante", description: "No hay API de proveedor configurada.", variant: "destructive" });
      return;
    }
    try {
      const body = {
        proveedor,
        fecha,
        total,
        items: items.map((item) => ({
          producto: item.producto,
          cantidad: item.cantidad,
          unidad: item.unidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.cantidad * item.precio_unitario,
        })),
      };
      const res = await fetch(`${SUPPLIER_API_URL}/ordenes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPPLIER_API_TOKEN}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "No se pudo enviar la orden al proveedor.");
      }
      toast({ title: "Orden enviada", description: "Se envió la orden al proveedor." });
    } catch (err) {
      toast({
        title: "Error al enviar",
        description: err instanceof Error ? err.message : "No se pudo enviar la orden al proveedor.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle>Registrar compra</CardTitle>
        <CardDescription>Ingresa los datos de la compra y sus líneas de detalle.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="proveedor">Proveedor</Label>
            <Select
              value={proveedor ? String(proveedor) : ""}
              onValueChange={(value) => setProveedor(Number(value))}
              disabled={loadingSuppliers}
            >
              <SelectTrigger id="proveedor">
                <SelectValue placeholder={loadingSuppliers ? "Cargando proveedores..." : "Seleccionar proveedor"} />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={String(supplier.id)}>
                    {supplier.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha de compra</Label>
            <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
        </div>

        <PurchaseItemsTable items={items} products={products} onAdd={handleAddItem} onChange={handleChangeItem} onRemove={handleRemoveItem} />

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            El total se actualiza automáticamente al modificar cantidades y precios.
          </div>
          <div className="text-xl font-semibold">
            Total: <span className={total <= 0 ? "text-destructive" : ""}>{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 justify-end">
          {SUPPLIER_API_URL && SUPPLIER_API_TOKEN && (
            <Button type="button" variant="outline" onClick={handleSendToSupplier} disabled={createPurchase.isPending}>
              <Send className="h-4 w-4 mr-2" />
              Enviar orden al proveedor
            </Button>
          )}
          <Button type="button" onClick={handleSubmit} disabled={createPurchase.isPending}>
            {createPurchase.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Registrar compra
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}