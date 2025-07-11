import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../../hooks/use-toast";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Plus } from "lucide-react";
import { getCSRFToken } from "../../utils/csrf";
import { apiFetch } from "../../utils/api";
import { translateCategory } from "../../utils/categoryTranslations";
import type { Product } from "../../hooks/useProducts";

interface NewProduct {
  name: string;
  description: string;
  categoria: number;
  price: string;
  cost: string;
  stock: string;
  minStock: string;
  unit: string;
  supplier: string;
}

interface AddProductDialogProps {
  /** Callback executed after a product is successfully added */
  onProductAdded?: () => Promise<void> | void;
}

export default function AddProductDialog({ onProductAdded }: AddProductDialogProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const closeDialog = () => setIsDialogOpen(false);
  const [newProduct, setNewProduct] = useState<NewProduct>({
    name: "",
    description: "",
    categoria: 0,
    price: "",
    cost: "",
    stock: "",
    minStock: "",
    unit: "unidades",
    supplier: "",
  });

  const { data: categoriesData = [], isError: catError } = useQuery<{ id: number; nombre_categoria: string }[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await apiFetch("/api/categorias/");
      if (!res.ok) {
        throw new Error(`Failed to fetch categories: ${res.status}`);
      }
      return res.json();
    },
    staleTime: Infinity,
  });

  useEffect(() => {
    if (catError) {
      toast({
        title: "Error",
        description: "No se pudieron obtener las categorías",
        variant: "destructive",
      });
    }
  }, [catError]);

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.categoria) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    const categoriaId = newProduct.categoria;
    if (Number.isNaN(categoriaId) || categoriaId === 0) {
      toast({
        title: "Error",
        description: "Selecciona una categoría válida",
        variant: "destructive",
      });
      return;
    }

    const selectedCat = categoriesData.find((c) => c.id === categoriaId);
    const isIngrediente = selectedCat?.nombre_categoria?.toLowerCase().includes("ingred");

    const payload = {
      codigo: `AUTO-${Date.now()}`,
      nombre: newProduct.name,
      descripcion: newProduct.description,
      tipo: isIngrediente ? "ingredientes" : "empanada",
      costo: parseFloat(newProduct.cost) || 0,
      precio: parseFloat(newProduct.price) || 0,
      stock_actual: parseFloat(newProduct.stock) || 0,
      stock_minimo: parseFloat(newProduct.minStock) || 0,
      unidad_media: newProduct.unit,
      categoria: categoriaId,
      proveedor: newProduct.supplier || null,
    };

    try {
      const res = await apiFetch("/api/productos/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (res.status !== 201) {
        const text = await res.text();
        console.error("Server error", res.status, text);
        throw new Error(`Error del servidor: ${res.status}`);
      }

      const created = await res.json();
      queryClient.setQueryData<Product[]>(["products"], (old = []) => [
        ...old,
        {
          id: created.id,
          name: created.nombre,
          description: created.descripcion ?? "",
          categoria: parseInt(String(created.categoria)),
          categoria_nombre: created.categoria_nombre ?? "Sin categoría",
          price: parseFloat(String(created.precio)),
          cost: parseFloat(String(created.costo ?? 0)),
          stock: parseFloat(String(created.stock_actual)),
          minStock: parseFloat(String(created.stock_minimo)),
          unit: created.unidad_media,
          supplier: created.proveedor_nombre ?? String(created.proveedor),
        },
      ]);
      closeDialog();

      if (onProductAdded) {
        await onProductAdded();
      }

      toast({
        title: "Producto agregado",
        description: `${newProduct.name} ha sido agregado exitosamente`,
      });

      setNewProduct({
        name: "",
        description: "",
        categoria: 0,
        price: "",
        cost: "",
        stock: "",
        minStock: "",
        unit: "unidades",
        supplier: "",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudo agregar el producto",
        variant: "destructive",
      });
    }
  };

  return (
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
              required
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              placeholder="Ej: Empanadas de Carne"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              placeholder="Descripción detallada del producto"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="categoria">Categoría*</Label>
            <Select
              value={newProduct.categoria ? String(newProduct.categoria) : ""}
              onValueChange={(value) => setNewProduct({ ...newProduct, categoria: Number(value) })}
            >
              <SelectTrigger id="categoria" required>
                <SelectValue placeholder="Selecciona una categoría" />
              </SelectTrigger>
              <SelectContent>
                {categoriesData.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {translateCategory(cat.nombre_categoria)}
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
                required
                value={newProduct.price}
                onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cost">Costo</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                required
                value={newProduct.cost}
                onChange={(e) => setNewProduct({ ...newProduct, cost: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="stock">Stock Inicial</Label>
              <Input
                id="stock"
                type="number"
                required
                value={newProduct.stock}
                onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="minStock">Stock Mínimo</Label>
              <Input
                id="minStock"
                type="number"
                required
                value={newProduct.minStock}
                onChange={(e) => setNewProduct({ ...newProduct, minStock: e.target.value })}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={closeDialog}>
            Cancelar
          </Button>
          <Button onClick={handleAddProduct} className="bg-primary hover:bg-primary/90">
            Agregar Producto
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}