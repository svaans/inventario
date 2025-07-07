import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useProducts } from "../hooks/useProducts";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Plus, Search, Package } from "lucide-react";
import { toast } from "../hooks/use-toast";

interface Product {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: string;
  supplier: string;
}

export default function Products() {
  const queryClient = useQueryClient();
  const { data: products = [], refetch } = useProducts();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [categoriesData, setCategoriesData] = useState<{id: number; nombre_categoria: string;}[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    category: "",
    price: 0,
    cost: 0,
    stock: 0,
    minStock: 0,
    unit: "unidades",
    supplier: ""
  });

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "Todas" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["Todas", ...categoriesData.map((c) => c.nombre_categoria)];

  // Carga inicial de las categorías desde el backend
  useEffect(() => {
    fetch("http://localhost:8000/api/categorias/")
      .then((res) => res.json())
      .then((data) => setCategoriesData(data))
      .catch((err) => console.error(err));
  }, []);

  // Reinicia el filtro si la categoría seleccionada desaparece de la lista
  // (por ejemplo después de crear un producto y aún no aparece en el refetch)
  useEffect(() => {
    if (
      selectedCategory !== "Todas" &&
      !products.some((p) => p.category === selectedCategory)
    ) {
      console.warn(
        `⚠️ La categoría "${selectedCategory}" no tiene productos, reiniciando filtro a Todas`
      );
      setSelectedCategory("Todas");
    }
  }, [products, selectedCategory]);

  const handleAddProduct = async () => {
  if (!newProduct.name || !newProduct.category) {
    toast({
      title: "Error",
      description: "Por favor completa todos los campos requeridos",
      variant: "destructive"
    });
    return;
  }

  // Determinamos la categoría seleccionada para enviar su ID y calcular el tipo
  const selectedCat = categoriesData.find(c => c.id === parseInt(newProduct.category));

  const payload = {
    codigo: `AUTO-${Date.now()}`,
    nombre: newProduct.name,
    descripcion: newProduct.description,
    // Si la categoría menciona "ingred" asumimos que es un ingrediente
    tipo: selectedCat?.nombre_categoria.toLowerCase().includes("ingred") ? "ingredientes" : "empanada",
    costo: newProduct.cost,
    precio: newProduct.price,
    stock_actual: newProduct.stock,
    stock_minimo: newProduct.minStock,
    unidad_media: newProduct.unit,
    // Enviamos solo el ID de la categoría al backend
    categoria: parseInt(newProduct.category),
    proveedor: newProduct.supplier || null,
  };

  try {
    const res = await fetch("http://localhost:8000/api/productos/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status !== 201) {
      throw new Error(`Error del servidor: ${res.status}`);
    }

    const created = await res.json();

    // Actualiza la caché local para reflejar el nuevo producto inmediatamente
    queryClient.setQueryData<Product[]>(["products"], (old = []) => [
      ...old,
      {
        id: created.id,
        name: created.nombre,
        description: created.descripcion ?? "",
        category: created.categoria_nombre ?? String(created.categoria),
        price: parseFloat(String(created.precio)),
        cost: parseFloat(String(created.costo ?? 0)),
        stock: parseFloat(String(created.stock_actual)),
        minStock: parseFloat(String(created.stock_minimo)),
        unit: created.unidad_media,
        supplier: created.proveedor_nombre ?? String(created.proveedor),
      },
    ]);

    await refetch();

    toast({
      title: "Producto agregado",
      description: `${newProduct.name} ha sido agregado exitosamente`,
    });

    setNewProduct({
      name: "",
      description: "",
      category: "",
      price: 0,
      cost: 0,
      stock: 0,
      minStock: 0,
      unit: "unidades",
      supplier: ""
    });
    setIsDialogOpen(false); // SOLO cerrar si todo fue bien
  } catch (error) {
    console.error(error);
    toast({
      title: "Error",
      description: "No se pudo agregar el producto",
      variant: "destructive"
    });
    // No cerrar el modal si falla
  }
};

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock <= minStock) return { label: "Stock Bajo", variant: "destructive" as const };
    if (stock <= minStock * 1.5) return { label: "Stock Medio", variant: "outline" as const };
    return { label: "Stock Normal", variant: "secondary" as const };
  };

  const getMargin = (price: number, cost: number) => {
    return ((price - cost) / price * 100).toFixed(1);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Catálogo de Productos</h1>
          <p className="text-muted-foreground">Gestiona tu catálogo completo de empanadas</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 shadow-golden">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby="add-product-description" className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Agregar Nuevo Producto</DialogTitle>
              <DialogDescription id="add-product-description">
                Completa la información del nuevo producto
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre del Producto*</Label>
                <Input
                  id="name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  placeholder="Ej: Empanadas de Carne"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  placeholder="Descripción detallada del producto"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Categoría*</Label>
                <Select value={newProduct.category} onValueChange={(value) => setNewProduct({ ...newProduct, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesData.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.nombre_categoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="price">Precio de Venta</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cost">Costo</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={newProduct.cost}
                    onChange={(e) => setNewProduct({...newProduct, cost: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="stock">Stock Inicial</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({...newProduct, stock: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minStock">Stock Mínimo</Label>
                  <Input
                    id="minStock"
                    type="number"
                    value={newProduct.minStock}
                    onChange={(e) => setNewProduct({...newProduct, minStock: parseInt(e.target.value) || 0})}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddProduct} className="bg-primary hover:bg-primary/90">
                Agregar Producto
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
              ${(products.reduce((sum, p) => sum + p.price, 0) / products.length).toFixed(2)}
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
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
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
                    <Badge variant="outline">{product.category}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Precio</p>
                      <p className="font-semibold text-primary">${product.price}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Costo</p>
                      <p className="font-semibold">${product.cost}</p>
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