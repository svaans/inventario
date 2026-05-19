import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { useClients } from "../hooks/useClients";
import { useProducts } from "../hooks/useProducts";
import { useCreateSale } from "../hooks/useCreateSale";
import { useCreateClient } from "../hooks/useCreateClient";
import { toast } from "../hooks/use-toast";
import { formatCurrency } from "../utils/formatCurrency";
import { apiFetch } from "../utils/api";
import { ensureCSRFToken, getCSRFToken } from "../utils/csrf";
import { Check, ChevronRight, Plus, Trash2, Search, UserPlus, Barcode, ShoppingBag } from "lucide-react";

interface Item {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  stock: number;
}

const STEPS = ["Cliente", "Productos", "Resumen"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const idx = i + 1;
        const done = current > idx;
        const active = current === idx;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                done ? "bg-emerald-500 text-white" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {done ? <Check className="w-4 h-4" /> : idx}
              </div>
              <span className={`text-xs ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-16 h-px mx-2 mb-5 ${current > idx ? "bg-emerald-500" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function SalesWizard() {
  const [step, setStep] = useState(1);
  const [clientSearch, setClientSearch] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);
  const { data: clients = [] } = useClients(clientSearch);
  const createClient = useCreateClient();
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ nombre: "", contacto: "", email: "", direccion: "" });

  const [prodSearch, setProdSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const { data: products = [] } = useProducts(prodSearch, barcode);
  const finalProducts = products.filter((p) => p.categoria_nombre !== "Ingredientes");
  const [items, setItems] = useState<Item[]>([]);
  const createSale = useCreateSale();
  const today = new Date().toISOString().slice(0, 10);
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const [summary, setSummary] = useState<{ count: number; total: number } | null>(null);
  const [saleId, setSaleId] = useState<number | null>(null);
  const [invoiceEmail, setInvoiceEmail] = useState("");

  const addProduct = (p: Item) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === p.id);
      if (existing) return prev.map((i) => i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { ...p, cantidad: 1 }];
    });
    setProdSearch("");
    setBarcode("");
  };

  const updateQty = (id: number, qty: number) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, cantidad: Math.max(1, qty) } : it)));

  const removeItem = (id: number) => setItems(items.filter((i) => i.id !== id));

  const handleCreateClient = async () => {
    try {
      const created = await createClient.mutateAsync(newClient);
      setClientId(created.id);
      setClientSearch(created.nombre);
      setShowNewClient(false);
      toast({ title: "Cliente registrado" });
      setStep(2);
    } catch {
      toast({ title: "Error al registrar cliente", variant: "destructive" });
    }
  };

  const handleConfirm = async () => {
    try {
      const created = await createSale.mutateAsync({
        fecha: today,
        cliente: clientId ?? undefined,
        detalles: items.map((i) => ({ producto: i.id, cantidad: i.cantidad, precio_unitario: i.precio })),
      });
      setSaleId(created.id);
      const selectedClient = clients.find((c) => c.id === clientId);
      setInvoiceEmail((selectedClient as { email?: string })?.email || newClient.email || "");
      const res = await apiFetch("/api/sales-summary/", { credentials: "include" });
      if (res.ok) setSummary(await res.json());
      toast({ title: "Venta registrada" });
      setStep(4);
    } catch {
      toast({ title: "Error al registrar la venta", variant: "destructive" });
    }
  };

  const resetWizard = () => {
    setItems([]);
    setClientId(null);
    setClientSearch("");
    setSaleId(null);
    setInvoiceEmail("");
    setSummary(null);
    setStep(1);
  };

  if (step === 4) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold mb-1">¡Venta registrada!</h1>
        {summary && (
          <p className="text-muted-foreground text-sm mb-6">
            Hoy llevas {summary.count} venta{summary.count !== 1 ? "s" : ""} por {formatCurrency(summary.total)}
          </p>
        )}
        <Card className="text-left mb-6">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground mb-2">Factura</p>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              disabled={!saleId}
              onClick={() => saleId && window.open(`/api/ventas/${saleId}/factura/`, "_blank")}
            >
              <ShoppingBag className="w-4 h-4" /> Descargar PDF
            </Button>
            <div className="flex gap-2">
              <Input
                placeholder="Correo para enviar factura"
                value={invoiceEmail}
                onChange={(e) => setInvoiceEmail(e.target.value)}
                className="flex-1"
              />
              <Button
                disabled={!saleId || !invoiceEmail}
                onClick={async () => {
                  if (!saleId) return;
                  try {
                    await ensureCSRFToken();
                    const res = await apiFetch(`/api/ventas/${saleId}/factura/enviar/`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRFToken() },
                      credentials: "include",
                      body: JSON.stringify({ email: invoiceEmail }),
                    });
                    if (!res.ok) throw new Error();
                    toast({ title: "Factura enviada" });
                  } catch {
                    toast({ title: "Error al enviar la factura", variant: "destructive" });
                  }
                }}
              >
                Enviar
              </Button>
            </div>
          </CardContent>
        </Card>
        <Button onClick={resetWizard} className="w-full">Nueva venta</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-center mb-2">Registrar Venta</h1>
      <StepIndicator current={step} />

      {/* ── STEP 1: Cliente ── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
            <Input
              value={clientSearch}
              onChange={(e) => { setClientSearch(e.target.value); setShowNewClient(false); }}
              placeholder="Buscar cliente por nombre…"
              className="pl-9"
            />
          </div>

          {clientSearch && !showNewClient && (
            <div className="border rounded-lg overflow-hidden">
              {clients.length > 0 ? clients.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setClientId(c.id); setClientSearch(c.nombre); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center justify-between ${clientId === c.id ? "bg-primary/5 text-primary font-medium" : ""}`}
                >
                  {c.nombre}
                  {clientId === c.id && <Check className="w-4 h-4 text-primary" />}
                </button>
              )) : (
                <div className="px-4 py-3 text-sm text-muted-foreground">No se encontró "{clientSearch}"</div>
              )}
            </div>
          )}

          {clientId && !showNewClient && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-sm">
              <Check className="w-4 h-4 text-primary shrink-0" />
              <span className="font-medium text-primary">{clientSearch}</span>
              <button type="button" onClick={() => { setClientId(null); setClientSearch(""); }} className="ml-auto text-muted-foreground hover:text-foreground text-xs">✕</button>
            </div>
          )}

          {!showNewClient ? (
            <button
              type="button"
              onClick={() => setShowNewClient(true)}
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <UserPlus className="w-4 h-4" /> Registrar nuevo cliente
            </button>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium">Nuevo cliente</p>
                <Input placeholder="Nombre *" value={newClient.nombre} onChange={(e) => setNewClient({ ...newClient, nombre: e.target.value })} />
                <Input placeholder="Teléfono" value={newClient.contacto} onChange={(e) => setNewClient({ ...newClient, contacto: e.target.value })} />
                <Input placeholder="Email (opcional)" type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
                <Input placeholder="Dirección (opcional)" value={newClient.direccion} onChange={(e) => setNewClient({ ...newClient, direccion: e.target.value })} />
                <div className="flex gap-2 justify-end pt-1">
                  <Button variant="outline" size="sm" onClick={() => setShowNewClient(false)}>Cancelar</Button>
                  <Button size="sm" onClick={handleCreateClient} disabled={!newClient.nombre || createClient.isPending}>
                    {createClient.isPending ? "Guardando…" : "Guardar y continuar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => { setClientId(null); setClientSearch(""); setStep(2); }}>
              Continuar sin cliente
            </Button>
            <Button onClick={() => setStep(2)} disabled={!clientId}>
              Siguiente <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Productos ── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative w-36">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
              <Input value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Código" className="pl-9" />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
              <Input value={prodSearch} onChange={(e) => setProdSearch(e.target.value)} placeholder="Buscar producto…" className="pl-9" />
            </div>
          </div>

          {(prodSearch || barcode) && (
            <div className="border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
              {finalProducts.length > 0 ? finalProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProduct({ id: p.id, nombre: p.name, precio: p.price, cantidad: 1, stock: p.stock })}
                  className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-center justify-between gap-3"
                >
                  <span className="text-sm">{p.name}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground">Stock: {p.stock}</span>
                    <span className="text-sm font-medium">{formatCurrency(p.price)}</span>
                    <Plus className="w-4 h-4 text-primary" />
                  </div>
                </button>
              )) : (
                <div className="px-4 py-3 text-sm text-muted-foreground">Sin resultados</div>
              )}
            </div>
          )}

          {items.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Artículos seleccionados</p>
              {items.map((i) => (
                <div key={i.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{i.nombre}</p>
                    <p className="text-xs text-muted-foreground">{formatCurrency(i.precio)} c/u</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={() => updateQty(i.id, i.cantidad - 1)} className="w-6 h-6 rounded border flex items-center justify-center text-sm hover:bg-muted">−</button>
                    <span className="w-8 text-center text-sm font-medium">{i.cantidad}</span>
                    <button type="button" onClick={() => updateQty(i.id, i.cantidad + 1)} className="w-6 h-6 rounded border flex items-center justify-center text-sm hover:bg-muted">+</button>
                  </div>
                  {i.cantidad > i.stock && <span className="text-xs text-destructive shrink-0">Sin stock</span>}
                  <span className="text-sm font-semibold w-20 text-right">{formatCurrency(i.precio * i.cantidad)}</span>
                  <button type="button" onClick={() => removeItem(i.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <div className="flex justify-between items-center pt-1 border-t px-1">
                <span className="text-sm text-muted-foreground">{items.reduce((s, i) => s + i.cantidad, 0)} artículo{items.reduce((s, i) => s + i.cantidad, 0) !== 1 ? "s" : ""}</span>
                <span className="font-bold">{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          {items.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">Buscá y agregá productos para continuar</div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>Atrás</Button>
            <Button onClick={() => setStep(3)} disabled={items.length === 0 || items.some((i) => i.cantidad > i.stock)}>
              Revisar <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Resumen ── */}
      {step === 3 && (
        <div className="space-y-4">
          {clientSearch && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-sm">
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-medium">{clientSearch}</span>
            </div>
          )}

          <div className="space-y-1.5">
            {items.map((i) => (
              <div key={i.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border bg-card text-sm">
                <span>{i.nombre}</span>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>{formatCurrency(i.precio)} × {i.cantidad}</span>
                  <span className="font-semibold text-foreground w-20 text-right">{formatCurrency(i.precio * i.cantidad)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center rounded-xl bg-primary/5 border border-primary/20 px-4 py-3">
            <span className="font-semibold">Total</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(2)}>Atrás</Button>
            <Button onClick={handleConfirm} disabled={createSale.isPending}>
              {createSale.isPending ? "Registrando…" : "Confirmar venta"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
