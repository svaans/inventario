import { useRef, useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useClients } from "../hooks/useClients";
import { useProducts } from "../hooks/useProducts";
import { useCreateSale } from "../hooks/useCreateSale";
import { useCreateClient } from "../hooks/useCreateClient";
import { toast } from "../hooks/use-toast";
import { formatCurrency } from "../utils/formatCurrency";
import { apiFetch } from "../utils/api";
import { ensureCSRFToken, getCSRFToken } from "../utils/csrf";
import {
  ArrowLeft,
  ArrowRight,
  Barcode,
  Check,
  ChevronRight,
  Mail,
  Minus,
  Package,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  User,
  UserPlus,
} from "lucide-react";

interface Item {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  stock: number;
}

const STEPS = ["Cliente", "Productos", "Confirmar"];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${active ? "text-foreground" : done ? "text-emerald-600" : "text-muted-foreground"}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors
                ${active ? "border-primary bg-primary text-primary-foreground"
                  : done ? "border-emerald-500 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30"
                  : "border-border bg-background text-muted-foreground"}`}>
                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-sm font-medium hidden sm:inline ${active ? "" : done ? "" : "text-muted-foreground"}`}>{label}</span>
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
          </div>
        );
      })}
    </div>
  );
}

export default function SalesWizard() {
  const [step, setStep] = useState(0);

  // Client state
  const [clientSearch, setClientSearch] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);
  const [clientEmail, setClientEmail] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ nombre: "", contacto: "", email: "", direccion: "" });
  const { data: clients = [] } = useClients(clientSearch);
  const createClient = useCreateClient();

  // Product state
  const [prodSearch, setProdSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [showProdDropdown, setShowProdDropdown] = useState(false);
  const prodSearchRef = useRef<HTMLInputElement>(null);
  const { data: products = [] } = useProducts(prodSearch, barcode);
  const visibleProducts = products.filter((p) => p.categoria_nombre !== "Ingredientes").slice(0, 12);
  const [items, setItems] = useState<Item[]>([]);

  // Sale state
  const createSale = useCreateSale();
  const today = new Date().toISOString().slice(0, 10);
  const total = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const [saleId, setSaleId] = useState<number | null>(null);
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [daySummary, setDaySummary] = useState<{ count: number; total: number } | null>(null);

  const addProduct = (p: typeof products[0]) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === p.id);
      if (existing) return prev.map((i) => i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i);
      return [...prev, { id: p.id, nombre: p.name, precio: p.price, cantidad: 1, stock: p.stock }];
    });
    setProdSearch("");
    setBarcode("");
    setShowProdDropdown(false);
    prodSearchRef.current?.focus();
  };

  const updateItem = (id: number, partial: Partial<Item>) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, ...partial } : i));

  const removeItem = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id));

  const handleSelectClient = (c: { id: number; nombre: string }) => {
    setClientId(c.id);
    setClientSearch(c.nombre);
    setClientEmail((c as { email?: string }).email ?? "");
  };

  const handleCreateClient = async () => {
    if (!newClient.nombre.trim()) return;
    try {
      const created = await createClient.mutateAsync(newClient);
      setClientId(created.id);
      setClientSearch(created.nombre);
      setClientEmail(newClient.email);
      setShowNewClient(false);
      toast({ title: "Cliente registrado" });
    } catch {
      toast({ title: "Error al registrar cliente", variant: "destructive" });
    }
  };

  const handleNextStep0 = () => setStep(1);

  const handleNextStep1 = () => {
    if (items.length === 0) {
      toast({ title: "Sin productos", description: "Agrega al menos un producto.", variant: "destructive" });
      return;
    }
    const overStock = items.some((i) => i.cantidad > i.stock);
    if (overStock) {
      toast({ title: "Stock insuficiente", description: "Reduce la cantidad de los productos marcados en rojo.", variant: "destructive" });
      return;
    }
    setStep(2);
  };

  const handleConfirm = async () => {
    try {
      const created = await createSale.mutateAsync({
        fecha: today,
        cliente: clientId ?? undefined,
        detalles: items.map((i) => ({ producto: i.id, cantidad: i.cantidad, precio_unitario: i.precio })),
      });
      setSaleId(created.id);
      setInvoiceEmail(clientEmail);
      try {
        const res = await apiFetch("/api/sales-summary/", { credentials: "include" });
        if (res.ok) setDaySummary(await res.json());
      } catch { /* non-critical */ }
      toast({ title: "Venta registrada" });
      setStep(3);
    } catch (err) {
      toast({ title: "Error al registrar la venta", description: err instanceof Error ? err.message : undefined, variant: "destructive" });
    }
  };

  const resetWizard = () => {
    setItems([]);
    setClientId(null);
    setClientSearch("");
    setClientEmail("");
    setSaleId(null);
    setInvoiceEmail("");
    setDaySummary(null);
    setShowNewClient(false);
    setNewClient({ nombre: "", contacto: "", email: "", direccion: "" });
    setStep(0);
  };

  // ── Success ──────────────────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-lg text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">¡Venta registrada!</h2>
          {daySummary && (
            <p className="text-muted-foreground text-sm mt-1">
              Hoy llevas {daySummary.count} venta{daySummary.count !== 1 ? "s" : ""} por {formatCurrency(daySummary.total)}
            </p>
          )}
        </div>

        <Card className="text-left">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Factura #{saleId}</p>
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
                type="email"
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
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Registrar venta</h1>
        <p className="text-muted-foreground text-sm mt-1">Completa los pasos para registrar una nueva venta</p>
      </div>

      <StepIndicator current={step} />

      {/* ── STEP 0: Cliente ──────────────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-4">
          {!showNewClient ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
                <Input
                  value={clientSearch}
                  onChange={(e) => { setClientSearch(e.target.value); setClientId(null); }}
                  placeholder="Buscar cliente por nombre…"
                  className="pl-9"
                />
              </div>

              {/* Selected chip */}
              {clientId && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                  <Check className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium text-primary flex-1">{clientSearch}</span>
                  <button type="button" onClick={() => { setClientId(null); setClientSearch(""); }} className="text-muted-foreground hover:text-foreground text-xs transition-colors">✕</button>
                </div>
              )}

              {/* Results */}
              {clientSearch && !clientId && (
                <div className="rounded-xl border border-border overflow-hidden">
                  {clients.length > 0 ? clients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectClient(c)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm font-medium">{c.nombre}</span>
                    </button>
                  )) : (
                    <div className="px-4 py-4 text-sm text-muted-foreground text-center">
                      No se encontró "{clientSearch}"
                    </div>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowNewClient(true)}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <UserPlus className="w-4 h-4" /> Registrar nuevo cliente
              </button>
            </>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-semibold">Nuevo cliente</p>
                <Input
                  placeholder="Nombre *"
                  value={newClient.nombre}
                  onChange={(e) => setNewClient({ ...newClient, nombre: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Teléfono"
                      value={newClient.contacto}
                      onChange={(e) => setNewClient({ ...newClient, contacto: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Email"
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                </div>
                <Input
                  placeholder="Dirección (opcional)"
                  value={newClient.direccion}
                  onChange={(e) => setNewClient({ ...newClient, direccion: e.target.value })}
                />
                <div className="flex gap-2 justify-end pt-1">
                  <Button variant="outline" size="sm" onClick={() => setShowNewClient(false)}>Cancelar</Button>
                  <Button
                    size="sm"
                    onClick={handleCreateClient}
                    disabled={!newClient.nombre.trim() || createClient.isPending}
                  >
                    {createClient.isPending ? "Guardando…" : "Guardar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={handleNextStep0}>
              Continuar sin cliente
            </Button>
            <Button onClick={handleNextStep0} disabled={!!clientSearch && !clientId} className="gap-2">
              Siguiente <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 1: Productos ────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Client chip */}
          {clientId && clientSearch && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border text-sm">
              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-medium flex-1">{clientSearch}</span>
              <button type="button" onClick={() => setStep(0)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cambiar</button>
            </div>
          )}

          {/* Search */}
          <div className="flex gap-2">
            <div className="relative w-36 shrink-0">
              <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
              <Input
                value={barcode}
                onChange={(e) => { setBarcode(e.target.value); setShowProdDropdown(true); }}
                onFocus={() => setShowProdDropdown(true)}
                onBlur={() => setTimeout(() => setShowProdDropdown(false), 150)}
                placeholder="Código"
                className="pl-9"
              />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
              <Input
                ref={prodSearchRef}
                value={prodSearch}
                onChange={(e) => { setProdSearch(e.target.value); setShowProdDropdown(true); }}
                onFocus={() => setShowProdDropdown(true)}
                onBlur={() => setTimeout(() => setShowProdDropdown(false), 150)}
                placeholder="Buscar producto…"
                className="pl-9"
              />
              {showProdDropdown && (prodSearch || barcode) && visibleProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                  {visibleProducts.map((p) => {
                    const inList = items.some((i) => i.id === p.id);
                    const outOfStock = p.stock <= 0;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={() => addProduct(p)}
                        disabled={outOfStock}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                          ${outOfStock ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/60"}`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">Stock: {p.stock} · {formatCurrency(p.price)}</p>
                        </div>
                        {outOfStock ? (
                          <Badge variant="outline" className="text-destructive border-destructive/30 text-xs shrink-0">Sin stock</Badge>
                        ) : inList ? (
                          <span className="text-xs text-primary font-medium shrink-0">+1</span>
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Items list */}
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center rounded-xl border border-dashed border-border">
              <ShoppingBag className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Sin productos</p>
              <p className="text-xs text-muted-foreground mt-0.5">Buscá y agregá productos arriba</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span className="col-span-5">Producto</span>
                <span className="col-span-3 text-center">Cantidad</span>
                <span className="col-span-3 text-right">Precio unit.</span>
                <span className="col-span-1" />
              </div>
              {items.map((item) => {
                const overStock = item.cantidad > item.stock;
                return (
                  <Card key={item.id} className={`shadow-none ${overStock ? "border-destructive/50" : "border-border"}`}>
                    <CardContent className="p-3">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5 flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{item.nombre}</p>
                            <p className={`text-xs ${overStock ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                              {overStock ? `Máx: ${item.stock}` : `Stock: ${item.stock}`}
                            </p>
                          </div>
                        </div>
                        <div className="col-span-3 flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateItem(item.id, { cantidad: Math.max(1, item.cantidad - 1) })}
                            className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <Input
                            type="number"
                            min="1"
                            step="1"
                            value={item.cantidad}
                            onChange={(e) => updateItem(item.id, { cantidad: Math.max(1, parseInt(e.target.value) || 1) })}
                            className={`h-7 w-14 text-center text-sm px-1 ${overStock ? "border-destructive text-destructive" : ""}`}
                          />
                          <button
                            type="button"
                            onClick={() => updateItem(item.id, { cantidad: item.cantidad + 1 })}
                            className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="col-span-3">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.precio}
                            onChange={(e) => updateItem(item.id, { precio: parseFloat(e.target.value) || 0 })}
                            className="h-7 text-sm text-right"
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button type="button" onClick={() => removeItem(item.id)} className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-border/50 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{item.cantidad} × {formatCurrency(item.precio)}</span>
                        <span className="text-sm font-semibold">{formatCurrency(item.precio * item.cantidad)}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/30">
                <span className="text-sm font-medium">{items.reduce((s, i) => s + i.cantidad, 0)} artículo{items.reduce((s, i) => s + i.cantidad, 0) !== 1 ? "s" : ""}</span>
                <span className="text-base font-bold">{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(0)} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Atrás
            </Button>
            <Button onClick={handleNextStep1} disabled={items.length === 0} className="gap-2">
              Revisar <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Confirmar ────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          {/* Summary chips */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-950/40">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Cliente</p>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 truncate">
                  {clientSearch || "Sin cliente"}
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800/40">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Fecha</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{today}</p>
              </CardContent>
            </Card>
          </div>

          {/* Line items read-only */}
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b rounded-t-lg">
                <span className="col-span-5">Producto</span>
                <span className="col-span-2 text-right">Cant.</span>
                <span className="col-span-2 text-right">Precio</span>
                <span className="col-span-3 text-right">Subtotal</span>
              </div>
              {items.map((item) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b last:border-0">
                  <span className="col-span-5 font-medium">{item.nombre}</span>
                  <span className="col-span-2 text-right text-muted-foreground">{item.cantidad}</span>
                  <span className="col-span-2 text-right text-muted-foreground">{formatCurrency(item.precio)}</span>
                  <span className="col-span-3 text-right font-semibold">{formatCurrency(item.precio * item.cantidad)}</span>
                </div>
              ))}
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-muted/30 text-sm font-semibold rounded-b-lg">
                <span className="col-span-9">Total</span>
                <span className="col-span-3 text-right text-base font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(total)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Editar
            </Button>
            <Button onClick={handleConfirm} disabled={createSale.isPending} className="gap-2">
              {createSale.isPending ? "Registrando…" : <><Check className="w-4 h-4" /> Confirmar venta</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
