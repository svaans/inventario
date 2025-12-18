import { useState, useEffect, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "../../hooks/use-toast";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { ErrorBoundary } from "react-error-boundary";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Plus } from "lucide-react";
import { getCSRFToken } from "../../utils/csrf";
import { apiFetch, fetchCategories, fetchUnits } from "../../utils/api";
import { translateCategory } from "../../utils/categoryTranslations";
import type { Product } from "../../hooks/useProducts";
import { useProducts } from "../../hooks/useProducts";
import useFormFields from "../../hooks/useFormFields";

interface NewProduct {
  codigo: string;
  [key: string]: unknown;
  name: string;
  description: string;
  categoria: number;
  price: string;
  cost: string;
  stock: string;
  minStock: string;
  unit: number | null;
  supplier: string;
  impuesto: string;
  descuentoBase: string;
  unidadEmpaque: string;
  fechaAlta: string;
  vidaUtilDias: string;
  fechaCaducidad: string;
  activo: boolean;
  controlPorLote: boolean;
  controlPorSerie: boolean;
  codigoBarras: string;
  stockSeguridad: string;
  nivelReorden: string;
  leadTimeDias: string;
  mermaPorcentaje: string;
  rendimientoReceta: string;
  costoEstandar: string;
  costoPromedio: string;
  fechaCosto: string;
  almacenOrigen: string;
  imagenUrl: string;
}

interface AddProductDialogProps {
  /** Callback executed after a product is successfully added */
  onProductAdded?: () => Promise<void> | void;
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-lg border bg-muted/40 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function AddProductDialog({ onProductAdded }: AddProductDialogProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const closeDialog = () => setIsDialogOpen(false);
  const initialProduct: NewProduct = {
    codigo: "",
    name: "",
    description: "",
    categoria: 0,
    price: "",
    cost: "",
    stock: "",
    minStock: "",
    unit: null,
    supplier: "",
    impuesto: "0",
    descuentoBase: "0",
    unidadEmpaque: "1",
    fechaAlta: new Date().toISOString().split("T")[0],
    vidaUtilDias: "",
    fechaCaducidad: "",
    activo: true,
    controlPorLote: false,
    controlPorSerie: false,
    codigoBarras: "",
    stockSeguridad: "0",
    nivelReorden: "",
    leadTimeDias: "",
    mermaPorcentaje: "0",
    rendimientoReceta: "1",
    costoEstandar: "",
    costoPromedio: "",
    fechaCosto: "",
    almacenOrigen: "",
    imagenUrl: "",
  };

  const {
    values: newProduct,
    setValues: setNewProduct,
    handleChange,
    validateAll,
  } = useFormFields<NewProduct>(initialProduct, {
    codigo: (v: unknown) => ((v as string) ? null : "Requerido"),
    name: (v: unknown) => ((v as string) ? null : "Requerido"),
    categoria: (v: unknown) => ((v as number) > 0 ? null : "Requerido"),
  });

  const [ingredients, setIngredients] = useState<{ ingrediente: number; cantidad: string }[]>([]);
  const [currentIng, setCurrentIng] = useState<{ ingrediente: number; cantidad: string }>({ ingrediente: 0, cantidad: "" });
  const [possibleUnits, setPossibleUnits] = useState<number | null>(null);
  const { data: allProducts = [] } = useProducts();
  const ingredientOptions = allProducts.filter(p => p.tipo?.startsWith("ingred"));

  const {
    data: categoriesData = [],
    isError: catError,
    isLoading: catLoading,
  } = useQuery<{ id: number; nombre_categoria: string }[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: Infinity,
  });

  const { data: unitsData = [] } = useQuery<{ id: number; nombre: string; abreviatura: string }[]>({
    queryKey: ["units"],
    queryFn: fetchUnits,
    staleTime: Infinity,
  });

  const getId = (abbr: string) => unitsData.find(u => u.abreviatura === abbr)?.id ?? null;

  const selectedCategory = categoriesData.find(c => c.id === newProduct.categoria);
  const catName = selectedCategory?.nombre_categoria?.toLowerCase() ?? "";
  const isIngredientCategory = /ingred|insum/.test(catName);
  const isBeverageCategory = /bebida/.test(catName);
  const isFinalCategory = !isIngredientCategory && !isBeverageCategory;

  // Reset dependent fields when the category changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      setIngredients([]);
      setCurrentIng({ ingrediente: 0, cantidad: "" });
      setPossibleUnits(null);
      setNewProduct((np) => {
        const updated: Partial<NewProduct> = { ...np };
        if (!isIngredientCategory) {
          updated.unit = getId("u");
        } else {
          const abbr = unitsData.find(u => u.id === np.unit)?.abreviatura;
          updated.unit = getId(abbr === "lb" ? "lb" : "kg");
        }
        if (!isIngredientCategory && !isBeverageCategory) {
          updated.stock = "";
        }
        if (!isFinalCategory) {
          updated.minStock = "";
        }
        return updated as NewProduct;
      });
    }, 50); // permite que Radix cierre el menú antes del unmount

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newProduct.categoria]);

  useEffect(() => {
    if (isIngredientCategory) {
      const abbr = unitsData.find(u => u.id === newProduct.unit)?.abreviatura;
      if (abbr !== "kg" && abbr !== "lb") {
        setNewProduct((np) => ({ ...np, unit: getId("kg") }));
      }
    } else {
      if (unitsData.find(u => u.id === newProduct.unit)?.abreviatura !== "u") {
        setNewProduct((np) => ({ ...np, unit: getId("u") }));
      }
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
    const merma = (parseFloat(newProduct.mermaPorcentaje) || 0) / 100;
    const rendimiento = parseFloat(newProduct.rendimientoReceta) || 1;
    const values = ingredients.map(ing => {
      const opt = ingredientOptions.find(p => p.id === ing.ingrediente);
      const req = (parseFloat(ing.cantidad) || 0) * (1 + merma);
      if (!opt || req <= 0) return Infinity;
      return opt.stock / req;
    });
    const finite = values.filter(v => Number.isFinite(v));
    if (finite.length === 0) {
      setPossibleUnits(null);
    } else {
      setPossibleUnits(Math.floor(Math.min(...finite) * rendimiento));
    }
  }, [ingredients, ingredientOptions, newProduct.mermaPorcentaje, newProduct.rendimientoReceta]);

  const handleAddProduct = async () => {
    if (!validateAll()) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    const negativeField = [
      "price",
      "cost",
      "stock",
      "minStock",
      "stockSeguridad",
      "nivelReorden",
      "mermaPorcentaje",
      "costoEstandar",
      "costoPromedio",
    ].find((field) => parseFloat(String(newProduct[field as keyof NewProduct])) < 0);
    if (negativeField) {
      toast({
        title: "Error",
        description: "No se permiten números negativos",
        variant: "destructive",
      });
      return;
    }

    if (parseInt(newProduct.unidadEmpaque, 10) < 1) {
      toast({
        title: "Error",
        description: "La unidad de empaque debe ser al menos 1",
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
      if (!newProduct.stock || !newProduct.unit) {
        toast({
          title: "Error",
          description: "Completa unidad y stock",
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

    const price = parseFloat(newProduct.price) || 0;
    const cost = parseFloat(newProduct.cost) || 0;
    const margin = cost > 0 ? (price - cost) / cost : 1;
    if (margin < 0.15) {
      toast({
        title: "Alerta de margen",
        description: "El precio genera un margen bajo frente al costo.",
      });
    }

    const payload: Record<string, unknown> = {
      codigo: newProduct.codigo,
      nombre: newProduct.name,
      descripcion: newProduct.description,
      tipo: isIngredientCategory ? "ingredientes" : "empanada",
      costo: cost,
      precio: price,
      categoria: categoriaId,
      impuesto: parseFloat(newProduct.impuesto) || 0,
      descuento_base: parseFloat(newProduct.descuentoBase) || 0,
      unidad_empaque: parseInt(newProduct.unidadEmpaque, 10) || 1,
      fecha_alta: newProduct.fechaAlta || undefined,
      vida_util_dias: parseInt(newProduct.vidaUtilDias, 10) || 0,
      fecha_caducidad: newProduct.fechaCaducidad || null,
      activo: newProduct.activo,
      control_por_lote: newProduct.controlPorLote,
      control_por_serie: newProduct.controlPorSerie,
      codigo_barras: newProduct.codigoBarras,
      stock_seguridad: parseFloat(newProduct.stockSeguridad) || 0,
      nivel_reorden: parseFloat(newProduct.nivelReorden) || 0,
      lead_time_dias: parseInt(newProduct.leadTimeDias, 10) || 0,
      merma_porcentaje: parseFloat(newProduct.mermaPorcentaje) || 0,
      rendimiento_receta: parseFloat(newProduct.rendimientoReceta) || 1,
      costo_estandar: parseFloat(newProduct.costoEstandar) || 0,
      costo_promedio: parseFloat(newProduct.costoPromedio) || 0,
      fecha_costo: newProduct.fechaCosto || null,
      almacen_origen: newProduct.almacenOrigen,
      imagen_url: newProduct.imagenUrl,
    };

    if (isIngredientCategory) {
      payload.stock_actual = parseFloat(newProduct.stock) || 0;
      payload.stock_minimo = parseFloat(newProduct.minStock) || 0;
      payload.unidad_media = newProduct.unit;
      payload.ingredientes = [];
    } else if (isFinalCategory) {
      payload.stock_minimo = parseFloat(newProduct.minStock) || 0;
      payload.stock_actual = 0;
      payload.unidad_media = getId("u");
      payload.ingredientes = ingredients.map((ing) => ({
        ingrediente: ing.ingrediente,
        cantidad_requerida: parseFloat(ing.cantidad) || 0,
      }));
    } else if (isBeverageCategory) {
      payload.stock_actual = parseFloat(newProduct.stock) || 0;
      payload.stock_minimo = 0;
      payload.unidad_media = getId("u");
    }

    if (newProduct.supplier) {
      payload.proveedor = newProduct.supplier;
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
          codigo: created.codigo,
          name: created.nombre,
          description: created.descripcion ?? "",
          tipo: created.tipo ?? (isIngredientCategory ? "ingredientes" : "empanada"),
          categoria: parseInt(String(created.categoria)),
          categoria_nombre: created.categoria_nombre ?? "Sin categoría",
          price: parseFloat(String(created.precio)),
          cost: parseFloat(String(created.costo ?? 0)),
          stock: parseFloat(String(created.stock_actual)),
          minStock: parseFloat(String(created.stock_minimo)),
          unit: created.unidad_media_abreviatura,
          unitId: created.unidad_media,
          supplier: created.proveedor_nombre ?? String(created.proveedor),
          impuesto: created.impuesto ? Number(created.impuesto) : 0,
          descuento_base: created.descuento_base ? Number(created.descuento_base) : 0,
          unidad_empaque: created.unidad_empaque ? Number(created.unidad_empaque) : undefined,
          fecha_alta: created.fecha_alta,
          vida_util_dias: created.vida_util_dias ? Number(created.vida_util_dias) : undefined,
          fecha_caducidad: created.fecha_caducidad ?? null,
          activo: created.activo,
          control_por_lote: created.control_por_lote,
          control_por_serie: created.control_por_serie,
          codigo_barras: created.codigo_barras,
          stock_seguridad: created.stock_seguridad ? Number(created.stock_seguridad) : 0,
          nivel_reorden: created.nivel_reorden ? Number(created.nivel_reorden) : undefined,
          lead_time_dias: created.lead_time_dias ? Number(created.lead_time_dias) : undefined,
          merma_porcentaje: created.merma_porcentaje ? Number(created.merma_porcentaje) : 0,
          rendimiento_receta: created.rendimiento_receta ? Number(created.rendimiento_receta) : undefined,
          costo_estandar: created.costo_estandar ? Number(created.costo_estandar) : 0,
          costo_promedio: created.costo_promedio ? Number(created.costo_promedio) : 0,
          fecha_costo: created.fecha_costo ?? null,
          almacen_origen: created.almacen_origen,
          imagen_url: created.imagen_url,
          margen_bajo: created.margen_bajo,
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

      setNewProduct(initialProduct);
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
          <Plus aria-hidden="true" className="w-4 h-4 mr-2" />
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
          key="dialog-agregar-producto"
          aria-describedby="add-product-description"
          className="sm:max-w-5xl max-h-[85vh] overflow-hidden p-0"
        >
          <div className="flex h-full flex-col">
            <div className="px-6 pt-6">
              <DialogHeader>
                <DialogTitle>Agregar Nuevo Producto</DialogTitle>
                <DialogDescription id="add-product-description">
                  Completa la información del nuevo producto
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="space-y-6">
                <Section title="Información básica" description="Campos esenciales para identificar el producto.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="codigo">Código / SKU*</Label>
                      <Input
                        id="codigo"
                        required
                        value={newProduct.codigo}
                        onChange={(e) => handleChange("codigo", e.target.value)}
                        placeholder="Ej: SKU-001"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nombre del Producto*</Label>
                      <Input
                        id="name"
                        required
                        value={newProduct.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="Ej: Empanadas de Carne"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="description">Descripción</Label>
                      <Textarea
                        id="description"
                        value={newProduct.description}
                        onChange={(e) => handleChange("description", e.target.value)}
                        placeholder="Descripción detallada del producto"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="categoria">Categoría*</Label>
                      <Select
                        disabled={catLoading}
                        value={newProduct.categoria ? String(newProduct.categoria) : ""}
                        onValueChange={(value) => handleChange("categoria", Number(value))}
                      >
                        <SelectTrigger id="categoria">
                          <SelectValue
                            placeholder={catLoading ? "Cargando categorías..." : "Selecciona una categoría"}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriesData.map((cat) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>{translateCategory(cat.nombre_categoria)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="unidadEmpaque">Unidad de Empaque</Label>
                      <Input
                        id="unidadEmpaque"
                        type="number"
                        min={1}
                        value={newProduct.unidadEmpaque}
                        onChange={(e) => handleChange("unidadEmpaque", e.target.value)}
                        placeholder="Ej: 12 (caja de 12 unidades)"
                      />
                    </div>
                  </div>
                </Section>

                <Section title="Precios y costos" description="Configura márgenes, descuentos y costos de referencia.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="price">Precio de Venta</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min={0}
                        required
                        value={newProduct.price}
                        onChange={(e) => handleChange("price", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="cost">Costo</Label>
                      <Input
                        id="cost"
                        type="number"
                        step="0.01"
                        min={0}
                        required
                        value={newProduct.cost}
                        onChange={(e) => handleChange("cost", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="impuesto">Impuesto (IVA %)</Label>
                      <Input
                        id="impuesto"
                        type="number"
                        step="0.01"
                        min={0}
                        value={newProduct.impuesto}
                        onChange={(e) => handleChange("impuesto", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="descuentoBase">Descuento base (%)</Label>
                      <Input
                        id="descuentoBase"
                        type="number"
                        step="0.01"
                        min={0}
                        value={newProduct.descuentoBase}
                        onChange={(e) => handleChange("descuentoBase", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="grid gap-2">
                      <Label htmlFor="costoEstandar">Costo estándar</Label>
                      <Input
                        id="costoEstandar"
                        type="number"
                        step="0.01"
                        min={0}
                        value={newProduct.costoEstandar}
                        onChange={(e) => handleChange("costoEstandar", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="costoPromedio">Costo promedio</Label>
                      <Input
                        id="costoPromedio"
                        type="number"
                        step="0.01"
                        min={0}
                        value={newProduct.costoPromedio}
                        onChange={(e) => handleChange("costoPromedio", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="fechaCosto">Fecha del costo</Label>
                      <Input
                        id="fechaCosto"
                        type="date"
                        value={newProduct.fechaCosto}
                        onChange={(e) => handleChange("fechaCosto", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="almacenOrigen">Almacén / Bodega de origen</Label>
                    <Input
                      id="almacenOrigen"
                      value={newProduct.almacenOrigen}
                      onChange={(e) => handleChange("almacenOrigen", e.target.value)}
                      placeholder="Ej: Bodega central"
                    />
                  </div>
                </Section>

                <Section title="Fechas y caducidad">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="grid gap-2">
                      <Label htmlFor="fechaAlta">Fecha de alta</Label>
                      <Input
                        id="fechaAlta"
                        type="date"
                        value={newProduct.fechaAlta}
                        onChange={(e) => handleChange("fechaAlta", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="vidaUtilDias">Vida útil (días)</Label>
                      <Input
                        id="vidaUtilDias"
                        type="number"
                        min={0}
                        value={newProduct.vidaUtilDias}
                        onChange={(e) => handleChange("vidaUtilDias", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="fechaCaducidad">Fecha de caducidad</Label>
                      <Input
                        id="fechaCaducidad"
                        type="date"
                        value={newProduct.fechaCaducidad}
                        onChange={(e) => handleChange("fechaCaducidad", e.target.value)}
                      />
                    </div>
                  </div>
                </Section>

                <Section title="Identificación y visuales">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="codigoBarras">Código de barras (EAN/UPC)</Label>
                      <Input
                        id="codigoBarras"
                        value={newProduct.codigoBarras}
                        onChange={(e) => handleChange("codigoBarras", e.target.value)}
                        placeholder="Escanea o ingresa el código"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="imagenUrl">Imagen (URL)</Label>
                      <Input
                        id="imagenUrl"
                        value={newProduct.imagenUrl}
                        onChange={(e) => handleChange("imagenUrl", e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </Section>

                <Section title="Abastecimiento y stock" description="Organiza mínimos, reordenes y stock inicial.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="nivelReorden">Nivel de reorden</Label>
                      <Input
                        id="nivelReorden"
                        type="number"
                        min={0}
                        value={newProduct.nivelReorden}
                        onChange={(e) => handleChange("nivelReorden", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="leadTimeDias">Lead time proveedor (días)</Label>
                      <Input
                        id="leadTimeDias"
                        type="number"
                        min={0}
                        value={newProduct.leadTimeDias}
                        onChange={(e) => handleChange("leadTimeDias", e.target.value)}
                      />
                    </div>
                  </div>

                  { newProduct.categoria > 0 && (isIngredientCategory || isBeverageCategory) && (
                    <div key={isIngredientCategory ? "ingredient-stock" : "beverage-stock"} className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="stock">{isIngredientCategory ? "Peso Inicial" : "Stock Inicial"}</Label>
                        <Input
                          id="stock"
                          type="number"
                          min={0}
                          required
                          value={newProduct.stock}
                          onChange={(e) => handleChange("stock", e.target.value)}
                        />
                      </div>
                      {isIngredientCategory && (
                        <div className="grid gap-2">
                          <Label htmlFor="minStock">Peso Mínimo</Label>
                          <Input
                            id="minStock"
                            type="number"
                            min={0}
                            required
                            value={newProduct.minStock}
                            onChange={(e) => handleChange("minStock", e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {newProduct.categoria > 0 && isFinalCategory && (
                    <div key="final-minStock" className="grid gap-2 md:max-w-sm">
                      <Label htmlFor="minStock">Stock Mínimo</Label>
                      <Input
                        id="minStock"
                        type="number"
                        min={0}
                        required
                        value={newProduct.minStock}
                        onChange={(e) => handleChange("minStock", e.target.value)}
                      />
                    </div>
                  )}
                  {newProduct.categoria > 0 && isIngredientCategory && (
                    <div key="ingredient-unit" className="grid gap-2 md:max-w-xs">
                      <Label htmlFor="unit">Unidad de Peso</Label>
                      <Select
                        value={newProduct.unit ? String(newProduct.unit) : ""}
                        onValueChange={(val) => handleChange("unit", Number(val))}
                      >
                        <SelectTrigger id="unit">
                          <SelectValue placeholder="Unidad" />
                        </SelectTrigger>
                        <SelectContent>
                          {unitsData.map(u => (
                            <SelectItem key={u.id} value={String(u.id)}>{u.abreviatura}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="stockSeguridad">Stock de seguridad</Label>
                      <Input
                        id="stockSeguridad"
                        type="number"
                        min={0}
                        value={newProduct.stockSeguridad}
                        onChange={(e) => handleChange("stockSeguridad", e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="supplier">Proveedor (opcional)</Label>
                      <Input
                        id="supplier"
                        value={newProduct.supplier}
                        onChange={(e) => handleChange("supplier", e.target.value)}
                        placeholder="Selecciona o escribe un proveedor"
                      />
                    </div>
                  </div>
                </Section>

                <Section title="Configuración y controles" description="Activa solo lo necesario para simplificar el manejo diario.">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="flex items-center justify-between rounded-md border bg-background p-3">
                      <div>
                        <Label htmlFor="activo">Activo</Label>
                        <p className="text-sm text-muted-foreground">Disponible para vender y producir.</p>
                      </div>
                      <Switch id="activo" checked={newProduct.activo} onCheckedChange={(checked) => handleChange("activo", checked)} />
                    </div>
                    <div className="flex items-center justify-between rounded-md border bg-background p-3">
                      <div>
                        <Label htmlFor="controlPorLote">Control por lote</Label>
                        <p className="text-sm text-muted-foreground">Requiere seguimiento de lotes.</p>
                      </div>
                      <Switch id="controlPorLote" checked={newProduct.controlPorLote} onCheckedChange={(checked) => handleChange("controlPorLote", checked)} />
                    </div>
                    <div className="flex items-center justify-between rounded-md border bg-background p-3">
                      <div>
                        <Label htmlFor="controlPorSerie">Control por serie</Label>
                        <p className="text-sm text-muted-foreground">Para items serializados.</p>
                      </div>
                      <Switch id="controlPorSerie" checked={newProduct.controlPorSerie} onCheckedChange={(checked) => handleChange("controlPorSerie", checked)} />
                    </div>
                  </div>
                </Section>

                {newProduct.categoria > 0 && isFinalCategory && (
                  <Section
                    title="Receta e ingredientes"
                    description="Define merma, rendimiento y los insumos que componen el producto final."
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="mermaPorcentaje">Merma / desperdicio (%)</Label>
                        <Input
                          id="mermaPorcentaje"
                          type="number"
                          step="0.01"
                          min={0}
                          value={newProduct.mermaPorcentaje}
                          onChange={(e) => handleChange("mermaPorcentaje", e.target.value)}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="rendimientoReceta">Rendimiento de receta</Label>
                        <Input
                          id="rendimientoReceta"
                          type="number"
                          step="0.01"
                          min={0.01}
                          value={newProduct.rendimientoReceta}
                          onChange={(e) => handleChange("rendimientoReceta", e.target.value)}
                          placeholder="Unidades finales que produce la receta base"
                        />
                      </div>
                    </div>

                    {ingredientOptions.length > 0 && (
                      <div key="final-ingredients" className="space-y-2">
                        <Label>Ingredientes</Label>
                        <div className="flex flex-wrap gap-2">
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
                            {ingredientOptions.find(p => p.id === currentIng.ingrediente)?.unit ?? ""}
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
                              <p className="mt-1 text-xs text-muted-foreground">
                                Unidades posibles según stock actual: {possibleUnits}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </Section>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background px-6 py-4">
              <Button variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button onClick={handleAddProduct} className="bg-primary hover:bg-primary/90">
                Agregar Producto
              </Button>
            </div>
          </div>
        </DialogContent>
      </ErrorBoundary>
    </Dialog>
  );
}