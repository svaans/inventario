import { useState } from "react";
import { useProducts } from "../../hooks/useProducts";
import { useCreateSale } from "../../hooks/useCreateSale";
import { useClients } from "../../hooks/useClients";
import { useCreateClient } from "../../hooks/useCreateClient";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "../ui/sheet";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Label } from "../ui/label";
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
  const [clientSearch, setClientSearch] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);
  const { data: clients = [] } = useClients(clientSearch);
  const createClient = useCreateClient();
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({
    nombre: "",
    contacto: "",
    email: "",
    direccion: "",
  });
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const today = new Date().toISOString().slice(0, 10);

  const finalProducts = products.filter(
    (p) => p.categoria_nombre !== "Ingredientes"
  );
  const filtered = finalProducts.filter((p) =>
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

  const handleCreateClient = async () => {
    try {
      const created = await createClient.mutateAsync(newClient);
      setClientId(created.id);
      setClientSearch(created.nombre);
      setShowNewClient(false);
      toast({ title: "Cliente registrado" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (items.length === 0 || hasStockError) return;
    try {
      await createSale.mutateAsync({
        fecha: today,
        cliente: clientId ?? undefined,
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
    setClientId(null);
    setClientSearch("");
    setShowNewClient(false);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-[500px] flex-col justify-between gap-4 p-6 text-foreground"
      >
        <div className="flex flex-col gap-4 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold">Registrar Venta</SheetTitle>
          </SheetHeader>

          <div className="grid gap-2">
            <Label htmlFor="client">Cliente</Label>
            <Input
              id="client"
              placeholder="Buscar cliente"
              value={clientSearch}
              onChange={(e) => {
                setClientSearch(e.target.value);
                setClientId(null);
              }}
            />
            {clientSearch && !showNewClient && (
              <div className="border rounded max-h-32 overflow-auto">
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
                {clients.length === 0 && (
                  <div className="p-2 text-sm">No se encontró ningún cliente</div>
                )}
              </div>
            )}
            {clientSearch && clients.length === 0 && !showNewClient && (
              <Button variant="outline" size="sm" onClick={() => setShowNewClient(true)}>
                Registrar nuevo cliente
              </Button>
            )}
            {showNewClient && (
              <div className="space-y-2 border p-2 rounded">
                <Input
                  placeholder="Nombre"
                  value={newClient.nombre}
                  onChange={(e) => setNewClient({ ...newClient, nombre: e.target.value })}
                />
                <Input
                  placeholder="Teléfono"
                  value={newClient.contacto}
                  onChange={(e) => setNewClient({ ...newClient, contacto: e.target.value })}
                />
                <Input
                  placeholder="Email (opcional)"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                />
                <Input
                  placeholder="Dirección (opcional)"
                  value={newClient.direccion}
                  onChange={(e) => setNewClient({ ...newClient, direccion: e.target.value })}
                />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" onClick={handleCreateClient}>Guardar</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowNewClient(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
            {clientId && !showNewClient && (
              <p className="text-sm text-muted-foreground">Cliente seleccionado: {clientSearch}</p>
            )}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Buscar producto</label>
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Input
                  placeholder="Buscar por nombre"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => setSearchOpen(true)}
                />
              </PopoverTrigger>
              <PopoverContent className="bg-white dark:bg-zinc-900 shadow-md border rounded w-72 p-2">
                {filtered.length === 0 && (
                  <p className="p-2 text-sm text-muted-foreground">
                    Sin resultados
                  </p>
                )}
                {filtered.map((p) => (
                  <button
                    key={p.id}
                    className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded"
                    onClick={() => addProduct(p)}
                  >
                    <div className="flex justify-between">
                      <span>{p.name}</span>
                      <span>{formatCurrency(p.price)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Stock: {p.stock}</p>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Productos seleccionados</h3>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aún no se han agregado productos.
              </p>
            ) : (
              <div className="rounded border">
                <Table containerClassName="max-h-[240px]">
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
                        <TableCell>{i.name}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(i.price)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={1}
                            max={i.stock}
                            value={i.quantity}
                            onChange={(e) => {
                              const value = parseInt(e.target.value, 10);
                              if (!isNaN(value) && value >= 1) {
                                updateQty(i.id, value);
                              }
                            }}
                            className="w-20"
                          />
                          {i.quantity > i.stock && (
                            <p className="text-xs text-destructive">Sin stock</p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(i.price * i.quantity)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeItem(i.id)}
                          >
                            Eliminar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          {hasStockError && (
            <p className="text-sm text-destructive">
              Hay productos con cantidades mayores al stock disponible.
            </p>
          )}

          <div className="text-right text-lg font-bold mt-4">
            Total: {formatCurrency(total)}
          </div>
        </div>

        <SheetFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={handleCancel} type="button">
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={items.length === 0 || hasStockError || createSale.isPending}
          >
            {createSale.isPending ? "Registrando..." : "Registrar Venta"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
