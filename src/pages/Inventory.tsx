import { useState, useEffect } from "react";
import { useProducts } from "../hooks/useProducts";
import { useDashboard } from "../hooks/useDashboard";
import { toast } from "../hooks/use-toast";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import AddProductDialog from "../components/inventory/AddProductDialog";
import { InventoryStats } from "../components/inventory/InventoryStats";
import { Skeleton } from "../components/ui/skeleton";
import { Search, Package, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { formatCurrency } from "../utils/formatCurrency";
import { translateCategory } from "../utils/categoryTranslations";
import { getStockStatus } from "../utils/stockStatus";
import { useUpdateProduct } from "../hooks/useUpdateProduct";
import { useDeleteProduct } from "../hooks/useDeleteProduct";

import type { Product } from "../hooks/useProducts";

function StockBar({ stock, minStock }: { stock: number; minStock: number }) {
  const max = Math.max(minStock * 3, stock, 1);
  const pct = Math.min((stock / max) * 100, 100);
  const color =
    stock <= minStock
      ? "bg-red-500"
      : stock <= minStock * 1.5
      ? "bg-amber-400"
      : "bg-emerald-500";

  return (
    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

const STATUS_STYLES = {
  destructive: {
    badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-0",
    dot: "bg-red-500",
    border: "border-l-red-500",
  },
  outline: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-0",
    dot: "bg-amber-400",
    border: "border-l-amber-400",
  },
  secondary: {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0",
    dot: "bg-emerald-500",
    border: "border-l-emerald-500",
  },
} as const;

function ProductCard({
  product,
  onEdit,
  onDelete,
}: {
  product: Product;
  onEdit: (p: Product) => void;
  onDelete: (id: number) => void;
}) {
  const [showIngredients, setShowIngredients] = useState(false);
  const stockStatus = getStockStatus(product.stock, product.minStock);
  const styles = STATUS_STYLES[stockStatus.variant];
  const hasIngredients = !product.tipo.startsWith("ingred") && product.ingredientes && product.ingredientes.length > 0;

  return (
    <Card className={`border border-border border-l-4 ${styles.border} shadow-sm hover:shadow-md transition-all duration-200 flex flex-col`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold leading-snug truncate" title={product.name}>
              {product.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {translateCategory(product.categoria_nombre) || "Sin categoría"}
            </p>
          </div>
          <Badge className={`shrink-0 text-xs px-2 py-0.5 flex items-center gap-1 ${styles.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
            {stockStatus.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-3">
        {/* Stock bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Stock</span>
            <span className="font-medium text-foreground">
              {product.stock} / {product.minStock} {product.unit}
            </span>
          </div>
          <StockBar stock={product.stock} minStock={product.minStock} />
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-muted/50 rounded-lg p-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Precio unitario</p>
            <p className="font-semibold text-primary">{formatCurrency(product.price)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5">
            <p className="text-xs text-muted-foreground mb-0.5">Valor total</p>
            <p className="font-semibold">{formatCurrency(product.stock * product.price)}</p>
          </div>
        </div>

        {!product.tipo.startsWith("ingred") && (
          <div className="flex items-center justify-between text-sm border-t pt-2.5">
            <span className="text-muted-foreground">Unidades posibles</span>
            <span
              className={`font-semibold ${
                product.unidades_posibles != null && product.unidades_posibles < 1
                  ? "text-destructive"
                  : ""
              }`}
            >
              {product.unidades_posibles ?? "—"}
            </span>
          </div>
        )}

        {hasIngredients && (
          <div className="border-t pt-2">
            <button
              type="button"
              onClick={() => setShowIngredients((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {showIngredients ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {product.ingredientes!.length} ingrediente{product.ingredientes!.length !== 1 ? "s" : ""}
            </button>
            {showIngredients && (
              <div className="mt-2 space-y-1">
                {product.ingredientes!.map((ing) => (
                  <div
                    key={ing.ingrediente}
                    className="flex justify-between text-xs bg-muted/40 rounded px-2 py-1"
                  >
                    <span className="text-muted-foreground">{ing.ingrediente_nombre}</span>
                    <span className="font-medium">
                      {ing.cantidad_requerida} {ing.unidad}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-8 text-xs gap-1"
            onClick={() => onEdit(product)}
          >
            <Pencil className="w-3 h-3" />
            Editar
          </Button>
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            }
            title="¿Eliminar producto?"
            description={`Se eliminará "${product.name}" de forma permanente. Esta acción no se puede deshacer.`}
            onConfirm={() => onDelete(product.id)}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Inventory() {
  const { data: products = [], refetch, isLoading, isError } = useProducts();
  const { data: dashboard, isError: dashboardError } = useDashboard();

  useEffect(() => {
    if (isError) {
      toast({ title: "Error", description: "No se pudo obtener el inventario", variant: "destructive" });
    }
  }, [isError]);

  useEffect(() => {
    if (dashboardError) {
      toast({ title: "Error", description: "No se pudo cargar el dashboard", variant: "destructive" });
    }
  }, [dashboardError]);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todos");
  const [editing, setEditing] = useState<Product | null>(null);
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const [form, setForm] = useState({ stock: 0, price: 0, cost: 0, minStock: 0 });
  const [ingredients, setIngredients] = useState<{ ingrediente: number; cantidad: string }[]>([]);
  const [currentIngredient, setCurrentIngredient] = useState<{ ingrediente: number; cantidad: string }>({
    ingrediente: 0,
    cantidad: "",
  });

  const translatedProducts = products.map((p) => ({
    ...p,
    _translatedCategory: translateCategory(p.categoria_nombre) ?? p.categoria_nombre,
  }));

  const filteredProducts = translatedProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoriaSeleccionada === "Todos" || product._translatedCategory === categoriaSeleccionada;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    "Todos",
    ...Array.from(new Set(translatedProducts.map((p) => p._translatedCategory))).filter(
      (c): c is string => Boolean(c)
    ),
  ];

  const totalProducts = dashboard?.total_products ?? products.length;
  const lowStock = dashboard?.low_stock ?? products.filter((p) => p.stock <= p.minStock).length;
  const totalValue =
    dashboard?.inventory_value ?? products.reduce((sum, p) => sum + p.stock * p.price, 0);
  const lastUpdated = dashboard?.last_updated
    ? new Date(dashboard.last_updated).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  useEffect(() => {
    if (editing) {
      setForm({
        stock: editing.stock,
        price: editing.price,
        cost: editing.cost,
        minStock: editing.minStock,
      });
      setIngredients(
        (editing.ingredientes ?? []).map((ing) => ({
          ingrediente: ing.ingrediente,
          cantidad: String(ing.cantidad_requerida),
        }))
      );
      setCurrentIngredient({ ingrediente: 0, cantidad: "" });
    } else {
      setIngredients([]);
      setCurrentIngredient({ ingrediente: 0, cantidad: "" });
    }
  }, [editing]);

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      const isRecipeProduct = editing.tipo === "empanada" || editing.tipo === "producto_final";
      const sanitizedIngredients = ingredients
        .filter((ing) => ing.ingrediente && (parseFloat(ing.cantidad) || 0) > 0)
        .map((ing) => ({
          ingrediente: ing.ingrediente,
          cantidad_requerida: parseFloat(ing.cantidad) || 0,
        }));
      await updateProduct.mutateAsync({
        id: editing.id,
        stock_actual: form.stock,
        precio: form.price,
        costo: form.cost,
        stock_minimo: form.minStock,
        ...(isRecipeProduct ? { ingredientes: sanitizedIngredients } : {}),
      });
      toast({ title: "Producto actualizado" });
      setEditing(null);
      await refetch();
    } catch (err) {
      console.error(err);
      const description =
        err instanceof Error && err.message
          ? `No se pudo actualizar el producto: ${err.message}`
          : "No se pudo actualizar el producto";
      toast({ title: "Error", description, variant: "destructive" });
    }
  };

  const ingredientOptions = products.filter((p) => p.tipo?.startsWith("ingred"));

  const handleDelete = async (id: number) => {
    try {
      await deleteProduct.mutateAsync(id);
      toast({ title: "Producto eliminado" });
      await refetch();
    } catch {
      toast({ title: "Error", description: "No se pudo eliminar el producto", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="h-10 w-64 bg-muted rounded mb-2 animate-pulse" />
        <div className="h-4 w-80 bg-muted rounded mb-8 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[420px]" aria-describedby="update-product-description">
          <DialogHeader>
            <DialogTitle>Actualizar Producto</DialogTitle>
            <DialogDescription id="update-product-description">
              Modifica los datos y guarda los cambios
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="upd-stock">Stock</Label>
                <Input
                  id="upd-stock"
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="upd-min">Stock Mínimo</Label>
                <Input
                  id="upd-min"
                  type="number"
                  value={form.minStock}
                  onChange={(e) => setForm({ ...form, minStock: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="upd-price">Precio</Label>
                <Input
                  id="upd-price"
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="upd-cost">Costo</Label>
                <Input
                  id="upd-cost"
                  type="number"
                  step="0.01"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {editing && (editing.tipo === "empanada" || editing.tipo === "producto_final") && (
              <div className="grid gap-3 border-t pt-3">
                <div className="flex items-center justify-between">
                  <Label>Ingredientes</Label>
                  <span className="text-xs text-muted-foreground">Opcional</span>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={currentIngredient.ingrediente ? String(currentIngredient.ingrediente) : ""}
                    onValueChange={(val) =>
                      setCurrentIngredient({ ...currentIngredient, ingrediente: Number(val) })
                    }
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Ingrediente" />
                    </SelectTrigger>
                    <SelectContent>
                      {ingredientOptions.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="Cant."
                    value={currentIngredient.cantidad}
                    onChange={(e) =>
                      setCurrentIngredient({ ...currentIngredient, cantidad: e.target.value })
                    }
                    className="w-20"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (!currentIngredient.ingrediente || !currentIngredient.cantidad) return;
                      setIngredients((prev) => {
                        const idx = prev.findIndex((i) => i.ingrediente === currentIngredient.ingrediente);
                        if (idx >= 0) {
                          const next = [...prev];
                          next[idx] = { ...currentIngredient };
                          return next;
                        }
                        return [...prev, currentIngredient];
                      });
                      setCurrentIngredient({ ingrediente: 0, cantidad: "" });
                    }}
                  >
                    +
                  </Button>
                </div>
                {ingredients.length > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {ingredients.map((ing, index) => {
                      const opt = ingredientOptions.find((p) => p.id === ing.ingrediente);
                      return (
                        <div
                          key={`${ing.ingrediente}-${index}`}
                          className="flex items-center gap-2 bg-muted/40 rounded-lg px-2 py-1.5"
                        >
                          <span className="flex-1 text-sm">{opt?.name ?? ing.ingrediente}</span>
                          <Input
                            type="number"
                            value={ing.cantidad}
                            onChange={(e) => {
                              const next = [...ingredients];
                              next[index] = { ...ing, cantidad: e.target.value };
                              setIngredients(next);
                            }}
                            className="w-20 h-7 text-sm"
                          />
                          <span className="text-xs text-muted-foreground w-8">{opt?.unit ?? ""}</span>
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-destructive text-xs px-1"
                            onClick={() => setIngredients(ingredients.filter((_, i) => i !== index))}
                          >
                            ✕
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdate} disabled={updateProduct.isPending}>
                {updateProduct.isPending ? "Guardando…" : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Inventario</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Control y seguimiento de todos tus productos
          </p>
        </div>
        <AddProductDialog onProductAdded={async () => { await refetch(); }} />
      </div>

      <InventoryStats
        totalProducts={totalProducts}
        lowStock={lowStock}
        totalValue={totalValue}
        lastUpdated={lastUpdated}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
          <Input
            placeholder="Buscar productos…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.filter(Boolean).map((categoria) => (
            <button
              key={categoria}
              type="button"
              onClick={() => categoria && setCategoriaSeleccionada(categoria)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                categoriaSeleccionada === categoria
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {categoria}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      {searchTerm || categoriaSeleccionada !== "Todos" ? (
        <p className="text-xs text-muted-foreground mb-4">
          {filteredProducts.length} resultado{filteredProducts.length !== 1 ? "s" : ""}
        </p>
      ) : null}

      {/* Products grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onEdit={setEditing}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Sin resultados</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {searchTerm
              ? `No hay productos que coincidan con "${searchTerm}"`
              : "No hay productos en esta categoría"}
          </p>
          {(searchTerm || categoriaSeleccionada !== "Todos") && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-3"
              onClick={() => {
                setSearchTerm("");
                setCategoriaSeleccionada("Todos");
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
