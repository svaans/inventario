import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useClients } from "../hooks/useClients";
import { useProducts } from "../hooks/useProducts";
import { useCreateSale } from "../hooks/useCreateSale";
import { toast } from "../hooks/use-toast";
import { formatCurrency } from "../utils/formatCurrency";
import { apiFetch } from "../utils/api";

interface Item {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  stock: number;
}

export default function SalesWizard() {
  const [step, setStep] = useState(1);
  const [clientSearch, setClientSearch] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);
  const { data: clients = [] } = useClients(clientSearch);

  const [prodSearch, setProdSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const { data: products = [] } = useProducts(prodSearch, barcode);
  const finalProducts = products.filter(
    (p) => p.categoria_nombre !== "Ingredientes",
  );
  const [items, setItems] = useState<Item[]>([]);
  const createSale = useCreateSale();
  const today = new Date().toISOString().slice(0, 10);
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const [summary, setSummary] = useState<{
    count: number;
    total: number;
  } | null>(null);
  const addProduct = (p: Item) => {
    setItems((prev) => [...prev, { ...p, cantidad: 1 }]);
    setProdSearch("");
    setBarcode("");
  };

  const updateQty = (id: number, qty: number) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, cantidad: qty } : it)),
    );
  };

  const removeItem = (id: number) => setItems(items.filter((i) => i.id !== id));

  const handleConfirm = async () => {
    try {
      await createSale.mutateAsync({
        fecha: today,
        cliente: clientId ?? undefined,
        detalles: items.map((i) => ({
          producto: i.id,
          cantidad: i.cantidad,
          precio_unitario: i.precio,
        })),
      });
      const res = await apiFetch("/api/sales-summary/", {
        credentials: "include",
      });
      if (res.ok) setSummary(await res.json());
      toast({ title: "Venta registrada" });
      setStep(4);
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {step === 1 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Paso 1: Seleccionar Cliente</h1>
          <Input
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
            placeholder="Buscar cliente"
          />
          <div className="border rounded-md max-h-40 overflow-auto">
            {clients.map((c) => (
              <div
                key={c.id}
                className="p-2 hover:bg-muted cursor-pointer"
                onClick={() => {
                  setClientId(c.id);
                  setClientSearch(c.nombre);
                }}
              >
                {c.nombre}
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!clientSearch}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Paso 2: Productos</h1>
          <div className="flex gap-2">
            <Input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Escanear código"
              className="w-40"
            />
            <Input
              value={prodSearch}
              onChange={(e) => setProdSearch(e.target.value)}
              placeholder="Buscar producto"
              className="flex-1"
            />
          </div>
          <div className="border rounded-md max-h-48 overflow-auto">
            {finalProducts.map((p) => (
              <div
                key={p.id}
                className="p-2 hover:bg-muted cursor-pointer flex justify-between"
                onClick={() =>
                  addProduct({
                    id: p.id,
                    nombre: p.name,
                    precio: p.price,
                    cantidad: 1,
                    stock: p.stock,
                  })
                }
              >
                <span>{p.name}</span>
                <span className="text-sm text-muted-foreground">
                  {formatCurrency(p.price)}
                </span>
              </div>
            ))}
          </div>
          {items.length > 0 && (
            <div className="rounded border">
              <Table containerClassName="max-h-64">
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Precio</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="sr-only">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.nombre}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(i.precio)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={1}
                          className="w-20"
                          value={i.cantidad}
                          onChange={(e) =>
                            updateQty(i.id, parseInt(e.target.value) || 1)
                          }
                        />
                        {i.cantidad > i.stock && (
                          <p className="text-xs text-destructive">Sin stock</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(i.precio * i.cantidad)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(i.id)}
                        >
                          Quitar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex justify-between items-center pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              Atrás
            </Button>
            <div className="font-semibold">Total: {formatCurrency(total)}</div>
            <Button
              onClick={() => setStep(3)}
              disabled={
                items.length === 0 || items.some((i) => i.cantidad > i.stock)
              }
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Paso 3: Resumen</h1>
          <Card>
            <CardHeader>
              <CardTitle>Venta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>Cliente: {clientSearch || "N/A"}</div>
              {items.map((i) => (
                <div key={i.id} className="flex justify-between">
                  <span>
                    {i.nombre} x{i.cantidad}
                  </span>
                  <span>{formatCurrency(i.cantidad * i.precio)}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>
              Atrás
            </Button>
            <Button onClick={handleConfirm}>Confirmar Venta</Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4 text-center">
          <h1 className="text-xl font-bold">Venta Registrada</h1>
          {summary && (
            <p>
              Hoy llevas {summary.count} venta{summary.count !== 1 && "s"} por{" "}
              {formatCurrency(summary.total)}.
            </p>
          )}
          <Button
            onClick={() => {
              setItems([]);
              setClientId(null);
              setClientSearch("");
              setStep(1);
            }}
          >
            Nueva Venta
          </Button>
        </div>
      )}
    </div>
  );
}
