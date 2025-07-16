import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProducts } from "../hooks/useProducts";
import { toast } from "../hooks/use-toast";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Search, Package } from "lucide-react";
import { Skeleton } from "../components/ui/skeleton";
import { formatCurrency } from "../utils/formatCurrency";
import { translateCategory } from "../utils/categoryTranslations";
import { getStockStatus } from "../utils/stockStatus";
import { apiFetch, fetchCategories } from "../utils/api";



export default function Products() {
  const { data: products = [], isLoading, isError } = useProducts();

  // Obtener categorías desde Django con React Query
  const {
    data: categoriesData = [],
    isError: catError,
  } = useQuery<{ id: number; nombre_categoria: string }[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: Infinity,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todas");
  

  // Avisamos al usuario en caso de errores de carga
  useEffect(() => {
    if (isError) {
      toast({
        title: "Error",
        description: "No se pudo obtener el catálogo",
        variant: "destructive",
      });
    }
  }, [isError]);

  // Avisamos si falla la carga de categorías
  useEffect(() => {
    if (catError) {
      toast({
        title: "Error",
        description: "No se pudieron obtener las categorías",
        variant: "destructive",
      });
    }
  }, [catError]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      categoriaSeleccionada === "Todas" ||
      product.categoria_nombre === categoriaSeleccionada;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    "Todas",
    ...categoriesData
      .map((c) => translateCategory(c.nombre_categoria))
      .filter((c): c is string => Boolean(c)),
  ];


  // Reinicia el filtro si la categoría seleccionada desaparece de la lista
  // (por ejemplo después de crear un producto y aún no aparece en el refetch)
  useEffect(() => {
    if (
      categoriaSeleccionada !== "Todas" &&
      !products.some((p) => p.categoria_nombre === categoriaSeleccionada)
    ) {
      console.warn(
        `⚠️ La categoría "${categoriaSeleccionada}" no tiene productos, reiniciando filtro a Todas`
      );
      setCategoriaSeleccionada("Todas");
    }
  }, [products, categoriaSeleccionada]);


  const getMargin = (price: number, cost: number) => {
    return ((price - cost) / price * 100).toFixed(1);
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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Catálogo de Productos</h1>
          <p className="text-muted-foreground">Gestiona tu catálogo completo de empanadas</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(products.reduce((sum, p) => sum + p.price, 0) / (products.length || 1))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Margen Promedio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-golden">
              {(products.reduce((sum, p) => sum + parseFloat(getMargin(p.price, p.cost)), 0) / products.length).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categorías</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length - 1}</div>
          </CardContent>
        </Card>
      </div>

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
        <div className="flex gap-2 flex-wrap">
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
          const margin = getMargin(product.price, product.cost);
          
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
                <CardDescription>{product.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm text-muted-foreground">Categoría:</span>
                    <Badge variant="outline">
                      {product.categoria_nombre || "Sin categoría"}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Precio</p>
                      <p className="font-semibold text-primary">{formatCurrency(product.price)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Costo</p>
                      <p className="font-semibold">{formatCurrency(product.cost)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Stock</p>
                      <p className="font-semibold">{product.stock} {product.unit}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Margen</p>
                      <p className="font-semibold text-golden">{margin}%</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">Proveedor: {product.supplier}</p>
                  </div>
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