import { useState, useEffect } from "react";
import { useProducts } from "../hooks/useProducts";
import { useDashboard } from "../hooks/useDashboard";
import { toast } from "../hooks/use-toast";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { InventoryStats } from "../components/inventory/InventoryStats";
import { Skeleton } from "../components/ui/skeleton";
import { Search, Plus, Package } from "lucide-react";
import { formatCurrency } from "../utils/formatCurrency";
import { translateCategory } from "../utils/categoryTranslations";
import { useUpdateProduct } from "../hooks/useUpdateProduct";

import type { Product } from "../hooks/useProducts";

export default function Inventory() {
  const { data: products = [], refetch, isLoading, isError } = useProducts();
  const { data: dashboard } = useDashboard();

  // Notificamos cualquier error de carga para que el usuario pueda reintentar.
  useEffect(() => {
    if (isError) {
      toast({
        title: "Error",
        description: "No se pudo obtener el inventario",
        variant: "destructive",
      });
    }
  }, [isError]);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todos");
  const [editing, setEditing] = useState<Product | null>(null);
  const updateProduct = useUpdateProduct();
  const [form, setForm] = useState({ stock: 0, price: 0, cost: 0, minStock: 0 });

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoriaSeleccionada === "Todos" ||
      product.categoria_nombre === categoriaSeleccionada;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    "Todos",
    ...Array.from(new Set(products.map(p => translateCategory(p.categoria_nombre)))).filter(
      (c): c is string => Boolean(c)
    ),
  ];
  const totalProducts = dashboard?.total_products ?? products.length;
  const lowStock = dashboard?.low_stock ?? products.filter(p => p.stock <= p.minStock).length;
  const totalValue = dashboard?.inventory_value ?? products.reduce((sum, p) => sum + (p.stock * p.price), 0);
  const lastUpdated = dashboard?.last_updated
    ? new Date(dashboard.last_updated).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock <= minStock) return { label: "Stock Bajo", variant: "destructive" as const };
    if (stock <= minStock * 1.5) return { label: "Stock Medio", variant: "outline" as const };
    return { label: "Stock Normal", variant: "secondary" as const };
  };

  useEffect(() => {
    if (editing) {
      setForm({
        stock: editing.stock,
        price: editing.price,
        cost: editing.cost,
        minStock: editing.minStock,
      });
    }
  }, [editing]);

  const handleUpdate = async () => {
    if (!editing) return;
    try {
      await updateProduct.mutateAsync({
        id: editing.id,
        stock_actual: form.stock,
        precio: form.price,
        costo: form.cost,
        stock_minimo: form.minStock,
      });
      toast({ title: "Producto actualizado" });
      setEditing(null);
      await refetch();
    } catch {
      toast({ title: "Error", description: "No se pudo actualizar el producto", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Actualizar Producto</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="upd-stock">Stock</Label>
              <Input id="upd-stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="upd-price">Precio</Label>
              <Input id="upd-price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="upd-cost">Costo</Label>
              <Input id="upd-cost" type="number" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="upd-min">Stock Mínimo</Label>
              <Input id="upd-min" type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={handleUpdate} disabled={updateProduct.isPending}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Gestión de Inventario</h1>
          <p className="text-muted-foreground">Control y seguimiento de todos tus productos</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 shadow-golden">
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      <InventoryStats 
        totalProducts={totalProducts}
        lowStock={lowStock}
        totalValue={totalValue}
        lastUpdated={lastUpdated}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {categories.filter(Boolean).map(categoria => (
            <Button
              key={categoria}
              variant={categoriaSeleccionada === categoria ? "default" : "outline"}
              size="sm"
              onClick={() => categoria && setCategoriaSeleccionada(categoria)}
            >
              {categoria}
            </Button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => {
          const stockStatus = getStockStatus(product.stock, product.minStock);
          
          return (
            <Card key={product.id} className="hover:shadow-warm transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Package className="w-8 h-8 text-primary" />
                  <Badge variant={stockStatus.variant}>
                    {stockStatus.label}
                  </Badge>
                </div>
                <CardTitle className="text-xl">{product.name}</CardTitle>
                <CardDescription>
                  {product.categoria_nombre || "Sin categoría"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stock actual:</span>
                    <span className="font-semibold">{product.stock} {product.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stock mínimo:</span>
                    <span>{product.minStock} {product.unit}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Precio unitario:</span>
                    <span className="font-semibold text-primary">{formatCurrency(product.price)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Valor total:</span>
                    <span className="font-bold text-golden">
                      {formatCurrency(product.stock * product.price)}
                    </span>
                  </div>
                  </div>
                    <div className="pt-2 text-right">
                      <Button size="sm" onClick={() => setEditing(product)}>Actualizar</Button>
                    </div>
                </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No se encontraron productos</h3>
          <p className="text-muted-foreground">Intenta ajustar tus filtros de búsqueda</p>
        </div>
      )}
    </div>
  );
}