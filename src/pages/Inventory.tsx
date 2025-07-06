import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { InventoryStats } from "../components/inventory/InventoryStats";
import { Search, Plus, Package } from "lucide-react";

interface Product {
  id: number;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  price: number;
  unit: string;
}

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([
    {
      id: 1,
      name: "Empanadas de Carne",
      category: "Empanadas",
      stock: 150,
      minStock: 50,
      price: 2.50,
      unit: "unidades"
    },
    {
      id: 2,
      name: "Empanadas de Pollo",
      category: "Empanadas",
      stock: 120,
      minStock: 40,
      price: 2.30,
      unit: "unidades"
    },
    {
      id: 3,
      name: "Empanadas de Queso",
      category: "Empanadas",
      stock: 25,
      minStock: 30,
      price: 2.20,
      unit: "unidades"
    },
    {
      id: 4,
      name: "Harina de Trigo",
      category: "Ingredientes",
      stock: 15,
      minStock: 20,
      price: 1.80,
      unit: "kg"
    },
    {
      id: 5,
      name: "Carne Molida",
      category: "Ingredientes",
      stock: 8,
      minStock: 10,
      price: 7.50,
      unit: "kg"
    }
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Todos" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["Todos", ...new Set(products.map(p => p.category))];
  const totalProducts = products.length;
  const lowStock = products.filter(p => p.stock <= p.minStock).length;
  const totalValue = products.reduce((sum, p) => sum + (p.stock * p.price), 0);
  const lastUpdated = new Date().toLocaleTimeString();

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock <= minStock) return { label: "Stock Bajo", variant: "destructive" as const };
    if (stock <= minStock * 1.5) return { label: "Stock Medio", variant: "outline" as const };
    return { label: "Stock Normal", variant: "secondary" as const };
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
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
                <CardDescription>{product.category}</CardDescription>
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
                    <span className="font-semibold text-primary">${product.price}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Valor total:</span>
                    <span className="font-bold text-golden">
                      ${(product.stock * product.price).toFixed(2)}
                    </span>
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