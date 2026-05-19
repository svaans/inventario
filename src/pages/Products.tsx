import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProducts } from "../hooks/useProducts";
import { toast } from "../hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Search, Package, TrendingUp, Tag, Layers } from "lucide-react";
import { Skeleton } from "../components/ui/skeleton";
import { formatCurrency } from "../utils/formatCurrency";
import { translateCategory } from "../utils/categoryTranslations";
import { getStockStatus } from "../utils/stockStatus";
import { apiFetch, fetchCategories } from "../utils/api";

const STATUS_STYLES = {
  destructive: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border-0",
  outline: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border-0",
  secondary: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-0",
} as const;

const BORDER_STYLES = {
  destructive: "border-l-red-500",
  outline: "border-l-amber-400",
  secondary: "border-l-emerald-500",
} as const;

export default function Products() {
  const { data: products = [], isLoading, isError } = useProducts();
  const { data: categoriesData = [], isError: catError } = useQuery<{ id: number; nombre_categoria: string }[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: Infinity,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todas");

  useEffect(() => {
    if (isError) toast({ title: "Error", description: "No se pudo obtener el catálogo", variant: "destructive" });
  }, [isError]);

  useEffect(() => {
    if (catError) toast({ title: "Error", description: "No se pudieron obtener las categorías", variant: "destructive" });
  }, [catError]);

  useEffect(() => {
    if (categoriaSeleccionada !== "Todas" && !products.some((p) => p.categoria_nombre === categoriaSeleccionada)) {
      setCategoriaSeleccionada("Todas");
    }
  }, [products, categoriaSeleccionada]);

  const getMargin = (price: number, cost: number) =>
    price > 0 ? ((price - cost) / price * 100).toFixed(1) : "0.0";

  const avgMargin = products.length
    ? (products.reduce((sum, p) => sum + parseFloat(getMargin(p.price, p.cost)), 0) / products.length).toFixed(1)
    : "0.0";

  const categories = [
    "Todas",
    ...categoriesData
      .map((c) => translateCategory(c.nombre_categoria))
      .filter((c): c is string => Boolean(c)),
  ];

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoriaSeleccionada === "Todas" || product.categoria_nombre === categoriaSeleccionada;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Skeleton className="h-10 w-56 mb-2" />
        <Skeleton className="h-4 w-72 mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Catálogo de Productos</h1>
        <p className="text-muted-foreground text-sm mt-1">Vista completa del catálogo con precios y márgenes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { title: "Total productos", value: products.length.toString(), icon: Package, bg: "bg-blue-50 dark:bg-blue-950/40", iconBg: "bg-blue-100 dark:bg-blue-900/60", iconColor: "text-blue-600 dark:text-blue-400", valueColor: "text-blue-700 dark:text-blue-300" },
          { title: "Precio promedio", value: formatCurrency(products.reduce((s, p) => s + p.price, 0) / (products.length || 1)), icon: TrendingUp, bg: "bg-emerald-50 dark:bg-emerald-950/40", iconBg: "bg-emerald-100 dark:bg-emerald-900/60", iconColor: "text-emerald-600 dark:text-emerald-400", valueColor: "text-emerald-700 dark:text-emerald-300" },
          { title: "Margen promedio", value: `${avgMargin}%`, icon: TrendingUp, bg: "bg-amber-50 dark:bg-amber-950/40", iconBg: "bg-amber-100 dark:bg-amber-900/60", iconColor: "text-amber-600 dark:text-amber-400", valueColor: "text-amber-700 dark:text-amber-300" },
          { title: "Categorías", value: (categories.length - 1).toString(), icon: Layers, bg: "bg-slate-50 dark:bg-slate-800/40", iconBg: "bg-slate-100 dark:bg-slate-700/60", iconColor: "text-slate-500 dark:text-slate-400", valueColor: "text-slate-600 dark:text-slate-300" },
        ].map((stat) => (
          <Card key={stat.title} className={`border-0 shadow-sm ${stat.bg} transition-transform hover:-translate-y-0.5 duration-200`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.iconColor}`} aria-hidden />
                </div>
              </div>
              <p className={`text-2xl font-bold ${stat.valueColor}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
          {categories.filter(Boolean).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => cat && setCategoriaSeleccionada(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                categoriaSeleccionada === cat
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {(searchTerm || categoriaSeleccionada !== "Todas") && (
        <p className="text-xs text-muted-foreground mb-4">{filteredProducts.length} resultado{filteredProducts.length !== 1 ? "s" : ""}</p>
      )}

      {/* Grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product.stock, product.minStock);
            const margin = getMargin(product.price, product.cost);
            const borderColor = BORDER_STYLES[stockStatus.variant];

            return (
              <Card key={product.id} className={`border border-border border-l-4 ${borderColor} shadow-sm hover:shadow-md transition-all duration-200`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold leading-snug truncate flex-1" title={product.name}>
                      {product.name}
                    </CardTitle>
                    <Badge className={`shrink-0 text-xs px-2 py-0.5 ${STATUS_STYLES[stockStatus.variant]}`}>
                      {stockStatus.label}
                    </Badge>
                  </div>
                  {product.categoria_nombre && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Tag className="w-3 h-3" />
                      {translateCategory(product.categoria_nombre)}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <p className="text-xs text-muted-foreground mb-0.5">Precio</p>
                      <p className="font-semibold text-primary">{formatCurrency(product.price)}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <p className="text-xs text-muted-foreground mb-0.5">Costo</p>
                      <p className="font-semibold">{formatCurrency(product.cost)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <p className="text-xs text-muted-foreground mb-0.5">Stock</p>
                      <p className="font-semibold">{product.stock} {product.unit}</p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2.5">
                      <p className="text-xs text-muted-foreground mb-0.5">Margen</p>
                      <p className="font-semibold text-amber-600 dark:text-amber-400">{margin}%</p>
                    </div>
                  </div>
                  {!product.tipo.startsWith("ingred") && (
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-muted-foreground text-xs">Unidades posibles</span>
                      <span className={`font-semibold text-xs ${product.unidades_posibles != null && product.unidades_posibles < 1 ? "text-destructive" : ""}`}>
                        {product.unidades_posibles ?? "—"}
                      </span>
                    </div>
                  )}
                  {product.supplier && (
                    <p className="text-xs text-muted-foreground truncate border-t pt-2" title={product.supplier}>
                      Proveedor: {product.supplier}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Sin resultados</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {searchTerm ? `No hay productos que coincidan con "${searchTerm}"` : "No hay productos en esta categoría"}
          </p>
          {(searchTerm || categoriaSeleccionada !== "Todas") && (
            <button
              type="button"
              className="mt-3 text-sm text-primary hover:underline"
              onClick={() => { setSearchTerm(""); setCategoriaSeleccionada("Todas"); }}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}
