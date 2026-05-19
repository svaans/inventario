import { useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreatePurchase } from "@/hooks/useCreatePurchase";
import { useProducts } from "@/hooks/useProducts";
import { useSuppliers } from "@/hooks/useSuppliers";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/utils/formatCurrency";
import type { PurchaseItem } from "./PurchaseItemsTable";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  Loader2,
  Mail,
  Minus,
  Package,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  User,
} from "lucide-react";

const SUPPLIER_API_URL = import.meta.env.VITE_SUPPLIER_API_URL || import.meta.env.SUPPLIER_API_URL;
const SUPPLIER_API_TOKEN = import.meta.env.VITE_SUPPLIER_API_TOKEN || import.meta.env.SUPPLIER_API_TOKEN;

const STEPS = ["Proveedor", "Productos", "Confirmar"];

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
                  : done ? "border-emerald-500 bg-emerald-50 text-emerald-600"
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

export function PurchaseForm() {
  const navigate = useNavigate();
  const { data: products = [] } = useProducts();
  const { data: suppliers = [] } = useSuppliers();
  const createPurchase = useCreatePurchase();

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [step, setStep] = useState(0);
  const [fecha, setFecha] = useState(today);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [purchaseResult, setPurchaseResult] = useState<{ id: number; total: number } | null>(null);

  const selectedSupplier = useMemo(() => suppliers.find((s) => s.id === supplierId), [suppliers, supplierId]);

  const filteredSuppliers = useMemo(() => {
    if (!supplierSearch.trim()) return suppliers;
    const q = supplierSearch.toLowerCase();
    return suppliers.filter((s) => s.nombre.toLowerCase().includes(q));
  }, [suppliers, supplierSearch]);

  const supplierProducts = useMemo(() => {
    if (!supplierId) return products;
    return products.filter((p) => p.supplierId === supplierId);
  }, [products, supplierId]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return supplierProducts.slice(0, 12);
    return supplierProducts.filter((p) => p.name.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)).slice(0, 12);
  }, [supplierProducts, productSearch]);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0), [items]);

  const addProduct = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const existing = items.findIndex((i) => i.producto === productId);
    if (existing >= 0) {
      setItems((prev) => prev.map((item, idx) => idx === existing ? { ...item, cantidad: item.cantidad + 1 } : item));
    } else {
      setItems((prev) => [...prev, { producto: productId, cantidad: 1, precio_unitario: product.cost || 0, unidad: product.unit }]);
    }
    setProductSearch("");
    setShowProductDropdown(false);
    searchRef.current?.focus();
  };

  const updateItem = (index: number, partial: Partial<PurchaseItem>) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, ...partial } : item));
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNextStep1 = () => {
    if (!supplierId) {
      toast({ title: "Selecciona un proveedor", variant: "destructive" });
      return;
    }
    setStep(1);
  };

  const handleNextStep2 = () => {
    if (items.length === 0) {
      toast({ title: "Sin productos", description: "Agrega al menos un producto a la compra.", variant: "destructive" });
      return;
    }
    const invalid = items.some((i) => i.cantidad <= 0 || i.precio_unitario <= 0);
    if (invalid) {
      toast({ title: "Datos incompletos", description: "Cada producto debe tener cantidad y precio mayores que cero.", variant: "destructive" });
      return;
    }
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!supplierId) return;
    try {
      const payload = {
        proveedor: supplierId,
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
      setPurchaseResult(result);
      setStep(3);
    } catch (err) {
      toast({
        title: "Error al registrar",
        description: err instanceof Error ? err.message : "No se pudo registrar la compra.",
        variant: "destructive",
      });
    }
  };

  const handleSendToSupplier = async () => {
    if (!supplierId || !SUPPLIER_API_URL || !SUPPLIER_API_TOKEN) {
      toast({ title: "Configuración faltante", description: "No hay API de proveedor configurada.", variant: "destructive" });
      return;
    }
    try {
      const body = {
        proveedor: supplierId,
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPPLIER_API_TOKEN}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.text()) || "No se pudo enviar la orden.");
      toast({ title: "Orden enviada", description: "Se envió la orden al proveedor." });
    } catch (err) {
      toast({ title: "Error al enviar", description: err instanceof Error ? err.message : "No se pudo enviar.", variant: "destructive" });
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === 3 && purchaseResult) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mx-auto">
          <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Compra registrada</h2>
          <p className="text-muted-foreground mt-1">Compra #{purchaseResult.id} por {formatCurrency(purchaseResult.total)}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link to={`/purchases/${purchaseResult.id}`}>Ver detalle</Link>
          </Button>
          <Button asChild>
            <Link to="/purchases">Volver al listado</Link>
          </Button>
          {SUPPLIER_API_URL && SUPPLIER_API_TOKEN && (
            <Button variant="outline" onClick={handleSendToSupplier}>Enviar orden al proveedor</Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <Link to="/purchases" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver al listado
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Registrar compra</h1>
        <p className="text-muted-foreground text-sm mt-1">Completa los pasos para registrar una nueva compra</p>
      </div>

      <StepIndicator current={step} />

      {/* ── Step 0: Supplier + Date ────────────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="fecha">Fecha de compra</Label>
            <Input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="max-w-xs" />
          </div>

          <div className="space-y-2">
            <Label>Proveedor</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9"
                placeholder="Buscar proveedor…"
                value={supplierSearch}
                onChange={(e) => { setSupplierSearch(e.target.value); setSupplierId(null); }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredSuppliers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No se encontraron proveedores.</p>
            ) : (
              filteredSuppliers.map((s) => {
                const selected = supplierId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setSupplierId(s.id); setSupplierSearch(s.nombre); }}
                    className={`w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors
                      ${selected
                        ? "border-primary bg-primary/5 dark:bg-primary/10"
                        : "border-border bg-card hover:bg-muted/40"}`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5
                      ${selected ? "bg-primary/15" : "bg-muted"}`}>
                      <Building2 className={`w-4 h-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{s.nombre}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-0.5">
                        {s.contacto && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="w-3 h-3" />{s.contacto}
                          </span>
                        )}
                        {s.telefono && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3" />{s.telefono}
                          </span>
                        )}
                        {s.email && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3" />{s.email}
                          </span>
                        )}
                      </div>
                    </div>
                    {selected && <Check className="w-4 h-4 text-primary shrink-0 mt-1" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleNextStep1} disabled={!supplierId} className="gap-2">
              Continuar <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 1: Products ───────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Supplier summary chip */}
          {selectedSupplier && (
            <div className="flex items-center gap-3 rounded-xl border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 px-4 py-3">
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 shrink-0">
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">{selectedSupplier.nombre}</p>
                <p className="text-xs text-muted-foreground">{fecha}</p>
              </div>
              <button type="button" onClick={() => { setStep(0); setItems([]); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Cambiar
              </button>
            </div>
          )}

          {/* Product search */}
          <div className="space-y-2">
            <Label>Agregar producto</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                ref={searchRef}
                className="pl-9"
                placeholder={supplierProducts.length > 0 ? `Buscar entre ${supplierProducts.length} productos…` : "Sin productos para este proveedor"}
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                onFocus={() => setShowProductDropdown(true)}
                onBlur={() => setTimeout(() => setShowProductDropdown(false), 150)}
              />
              {showProductDropdown && filteredProducts.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                  {filteredProducts.map((p) => {
                    const inList = items.some((i) => i.producto === p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={() => addProduct(p.id)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 text-left transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.unit} · {formatCurrency(p.cost)}</p>
                        </div>
                        {inList ? (
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
              <ShoppingCart className="w-8 h-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">Sin productos</p>
              <p className="text-xs text-muted-foreground mt-0.5">Busca y selecciona productos arriba</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <span className="col-span-5">Producto</span>
                <span className="col-span-3 text-center">Cantidad</span>
                <span className="col-span-3 text-right">Precio unit.</span>
                <span className="col-span-1" />
              </div>
              {items.map((item, index) => {
                const product = products.find((p) => p.id === item.producto);
                const subtotal = item.cantidad * item.precio_unitario;
                return (
                  <Card key={index} className="border-border shadow-none">
                    <CardContent className="p-3">
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-5 flex items-center gap-2 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{product?.name ?? `Producto ${item.producto}`}</p>
                            <p className="text-xs text-muted-foreground">{item.unidad || product?.unit}</p>
                          </div>
                        </div>
                        <div className="col-span-3 flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateItem(index, { cantidad: Math.max(0.01, item.cantidad - 1) })}
                            className="w-6 h-6 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <Input
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={item.cantidad || ""}
                            onChange={(e) => updateItem(index, { cantidad: parseFloat(e.target.value) || 0 })}
                            className="h-7 w-16 text-center text-sm px-1"
                          />
                          <button
                            type="button"
                            onClick={() => updateItem(index, { cantidad: item.cantidad + 1 })}
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
                            value={item.precio_unitario || ""}
                            onChange={(e) => updateItem(index, { precio_unitario: parseFloat(e.target.value) || 0 })}
                            className="h-7 text-sm text-right"
                          />
                        </div>
                        <div className="col-span-1 flex justify-end">
                          <button type="button" onClick={() => removeItem(index)} className="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-border/50 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{item.cantidad} × {formatCurrency(item.precio_unitario)}</span>
                        <span className="text-sm font-semibold">{formatCurrency(subtotal)}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/30">
                <span className="text-sm font-medium">{items.length} producto{items.length !== 1 ? "s" : ""}</span>
                <span className="text-base font-bold">{formatCurrency(total)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(0)} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Atrás
            </Button>
            <Button onClick={handleNextStep2} disabled={items.length === 0} className="gap-2">
              Revisar <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Confirm ───────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Summary header */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-950/40">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Proveedor</p>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 truncate">{selectedSupplier?.nombre}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm bg-slate-50 dark:bg-slate-800/40">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Fecha</p>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{fecha}</p>
              </CardContent>
            </Card>
          </div>

          {/* Line items read-only */}
          <Card>
            <CardContent className="p-0">
              <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground uppercase tracking-wider border-b rounded-t-lg">
                <span className="col-span-5">Producto</span>
                <span className="col-span-2 text-right">Cantidad</span>
                <span className="col-span-2 text-right">Precio unit.</span>
                <span className="col-span-3 text-right">Subtotal</span>
              </div>
              {items.map((item, index) => {
                const product = products.find((p) => p.id === item.producto);
                return (
                  <div key={index} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b last:border-0">
                    <span className="col-span-5 font-medium">{product?.name ?? `Producto ${item.producto}`}</span>
                    <span className="col-span-2 text-right text-muted-foreground">{item.cantidad} {item.unidad}</span>
                    <span className="col-span-2 text-right text-muted-foreground">{formatCurrency(item.precio_unitario)}</span>
                    <span className="col-span-3 text-right font-semibold">{formatCurrency(item.cantidad * item.precio_unitario)}</span>
                  </div>
                );
              })}
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-muted/30 text-sm font-semibold rounded-b-lg">
                <span className="col-span-9">Total</span>
                <span className="col-span-3 text-right text-base font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(total)}</span>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
              <ArrowLeft className="w-4 h-4" /> Editar
            </Button>
            <Button onClick={handleSubmit} disabled={createPurchase.isPending} className="gap-2">
              {createPurchase.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Confirmar compra
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
