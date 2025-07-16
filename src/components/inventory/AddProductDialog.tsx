import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../../hooks/use-toast";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { ErrorBoundary } from "react-error-boundary";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Plus } from "lucide-react";
import { getCSRFToken } from "../../utils/csrf";
import { apiFetch, fetchCategories } from "../../utils/api";
import { translateCategory } from "../../utils/categoryTranslations";
import type { Product } from "../../hooks/useProducts";
import { useProducts } from "../../hooks/useProducts";

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

  const [ingredients, setIngredients] = useState<{ ingrediente: number; cantidad: string }[]>([]);
  const [currentIng, setCurrentIng] = useState<{ ingrediente: number; cantidad: string }>({ ingrediente: 0, cantidad: "" });
  const [possibleUnits, setPossibleUnits] = useState<number | null>(null);
  const { data: allProducts = [] } = useProducts();
  const ingredientOptions = allProducts.filter(p => p.es_ingrediente);

  const {
    data: categoriesData = [],
    isError: catError,
    isLoading: catLoading,
  } = useQuery<{ id: number; nombre_categoria: string }[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: Infinity,
  });

  const selectedCategory = categoriesData.find(c => c.id === newProduct.categoria);
  const catName = selectedCategory?.nombre_categoria?.toLowerCase() ?? "";
  const isIngredientCategory = /ingred|insum/.test(catName);
  const isBeverageCategory = /bebida/.test(catName);
  const isFinalCategory = !isIngredientCategory && !isBeverageCategory;

  // Reset dependent fields when the category changes
  useEffect(() => {
    setIngredients([]);
    setCurrentIng({ ingrediente: 0, cantidad: "" });
    setPossibleUnits(null);
    setNewProduct((np) => {
      const updated: Partial<NewProduct> = { ...np };
      if (!isIngredientCategory) {
        updated.supplier = "";
        updated.unit = "unidades";
      } else {
        updated.unit = np.unit === "kg" || np.unit === "lb" ? np.unit : "kg";
      }
      if (!isIngredientCategory && !isBeverageCategory) {
        updated.stock = "";
      }
      if (!isFinalCategory) {
        updated.minStock = "";
      }
      return updated as NewProduct;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newProduct.categoria]);

  useEffect(() => {
    if (isIngredientCategory) {
      if (newProduct.unit !== "kg" && newProduct.unit !== "lb") {
        setNewProduct((np) => ({ ...np, unit: "kg" }));
      }
    } else if (newProduct.unit !== "unidades") {
      setNewProduct((np) => ({ ...np, unit: "unidades" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIngredientCategory]);

  useEffect(() => {
    if (catError) {
      toast({
        title: "Error",
        description: "No se pudieron obtener las categorías",
        variant: "destructive",
      });
    }
  }, [catError]);

  useEffect(() => {
    if (ingredients.length === 0) {
      setPossibleUnits(null);
      return;
    }
    const values = ingredients.map(ing => {
      const opt = ingredientOptions.find(p => p.id === ing.ingrediente);
      const req = parseFloat(ing.cantidad) || 0;
      if (!opt || req <= 0) return Infinity;
      return opt.stock / req;
    });
    const finite = values.filter(v => Number.isFinite(v));
    if (finite.length === 0) {
      setPossibleUnits(null);
    } else {
      setPossibleUnits(Math.floor(Math.min(...finite)));
    }
  }, [ingredients, ingredientOptions]);

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

    if (isIngredientCategory) {
      if (!newProduct.stock || !newProduct.unit || !newProduct.supplier) {
        toast({
          title: "Error",
          description: "Completa unidad, stock y proveedor",
          variant: "destructive",
        });
        return;
      }
    }

    if (isFinalCategory) {
      if (!newProduct.minStock) {
        toast({
          title: "Error",
          description: "Ingresa el stock mínimo",
          variant: "destructive",
        });
        return;
      }
    }

    if (isBeverageCategory) {
      if (!newProduct.stock) {
        toast({
          title: "Error",
          description: "Ingresa el stock actual",
          variant: "destructive",
        });
        return;
      }
    }
    const payload: Record<string, unknown> = {
      codigo: `AUTO-${Date.now()}`,
      nombre: newProduct.name,
      descripcion: newProduct.description,
      tipo: isIngredientCategory ? "ingredientes" : "empanada",
      es_ingrediente: isIngredientCategory,
      costo: parseFloat(newProduct.cost) || 0,
      precio: parseFloat(newProduct.price) || 0,
      categoria: categoriaId,
    };

    if (isIngredientCategory) {
      payload.stock_actual = parseFloat(newProduct.stock) || 0;
      payload.stock_minimo = parseFloat(newProduct.minStock) || 0;
      payload.unidad_media = newProduct.unit;
      payload.proveedor = newProduct.supplier;
      payload.ingredientes = [];
    } else if (isFinalCategory) {
      payload.stock_minimo = parseFloat(newProduct.minStock) || 0;
      payload.stock_actual = 0;
      payload.unidad_media = "unidades";
      payload.ingredientes = ingredients.map((ing) => ({
        ingrediente: ing.ingrediente,
        cantidad_requerida: parseFloat(ing.cantidad) || 0,
      }));
    } else if (isBeverageCategory) {
      payload.stock_actual = parseFloat(newProduct.stock) || 0;
      payload.stock_minimo = 0;
      payload.unidad_media = "unidades";
    }

    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined || payload[k] === null) {
        delete payload[k];
      }
    });

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
        } as Product,
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
      setIngredients([]);
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
      <ErrorBoundary
        fallback={<p className="p-4 text-red-600">Error al cargar formulario</p>}
        onError={(error) => {
          console.error("Formulario roto:", error);
        }}
      >
        <DialogContent
          aria-describedby="add-product-description"
          className="sm:max-w-[425px]"
        >
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
            disabled={catLoading}
              value={newProduct.categoria ? String(newProduct.categoria) : ""}
              onValueChange={(value) =>
                setNewProduct({ ...newProduct, categoria: Number(value) })
              }
            >
              <SelectTrigger id="categoria">
                <SelectValue
                  placeholder={catLoading ? "Cargando categorías..." : "Selecciona una categoría"}
                />
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
          { newProduct.categoria > 0 && (isIngredientCategory || isBeverageCategory) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stock">{isIngredientCategory ? "Peso Inicial" : "Stock Inicial"}</Label>
                <Input
                  id="stock"
                  type="number"
                  required
                  value={newProduct.stock}
                  onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                />
              </div>
              {isIngredientCategory && (
                <div className="grid gap-2">
                  <Label htmlFor="minStock">Peso Mínimo</Label>
                  <Input
                    id="minStock"
                    type="number"
                    required
                    value={newProduct.minStock}
                    onChange={(e) => setNewProduct({ ...newProduct, minStock: e.target.value })}
                  />
                </div>
              )}
            </div>
          )}
          {newProduct.categoria > 0 && isFinalCategory && (
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
            )}
          {newProduct.categoria > 0 && isIngredientCategory && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="unit">Unidad de Peso</Label>
                <Select
                  value={newProduct.unit}
                  onValueChange={(val) => setNewProduct({ ...newProduct, unit: val })}
                >
                  <SelectTrigger id="unit">
                    <SelectValue placeholder="Unidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="lb">lb</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supplier">Proveedor</Label>
                <Input
                  id="supplier"
                  value={newProduct.supplier}
                  onChange={(e) => setNewProduct({ ...newProduct, supplier: e.target.value })}
                />
              </div>
            </>
          )}
          {/* Ingredientes para productos finales */}
          {newProduct.categoria > 0 && isFinalCategory && ingredientOptions.length > 0 && (
          <div className="space-y-2">
            <Label>Ingredientes</Label>
            <div className="flex gap-2">
              <Select
                value={currentIng.ingrediente ? String(currentIng.ingrediente) : ""}
                onValueChange={(val) => setCurrentIng({ ...currentIng, ingrediente: Number(val) })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Ingrediente" />
                </SelectTrigger>
                <SelectContent>
                  {ingredientOptions.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="Cantidad"
                value={currentIng.cantidad}
                onChange={(e) => setCurrentIng({ ...currentIng, cantidad: e.target.value })}
                className="w-24"
              />
              <span className="self-center text-sm text-muted-foreground">
                {ingredientOptions.find(p => p.id === currentIng.ingrediente)?.unit ?? ''}
              </span>
              <Button
                type="button"
                onClick={() => {
                  if (currentIng.ingrediente && currentIng.cantidad) {
                    setIngredients([...ingredients, currentIng]);
                    setCurrentIng({ ingrediente: 0, cantidad: "" });
                  }
                }}
              >
                Agregar
              </Button>
            </div>
            {ingredients.length > 0 && (
              <>
                <ul className="list-disc pl-4 text-sm">
                  {ingredients.map((ing, idx) => {
                    const opt = ingredientOptions.find((p) => p.id === ing.ingrediente);
                    const name = opt?.name || ing.ingrediente;
                    const unit = opt?.unit || "";
                    return (
                      <li key={idx}>{name}: {ing.cantidad} {unit}</li>
                    );
                  })}
                </ul>
                {possibleUnits !== null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Unidades posibles según stock actual: {possibleUnits}
                  </p>
                )}
              </>
            )}
          </div>
        )}
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
      </ErrorBoundary>
    </Dialog>
  );
}