import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";
import { Plus } from "lucide-react";

import { useProducts } from "../../hooks/useProducts";
import useFormFields from "../../hooks/useFormFields";
import { toast } from "../../hooks/use-toast";
import { apiFetch, fetchCategories, fetchUnits } from "../../utils/api";
import { translateCategory } from "../../utils/categoryTranslations";
import { getCSRFToken } from "../../utils/csrf";
import type { Product } from "../../hooks/useProducts";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";

interface NewProduct {
  [key: string]: unknown;
  codigo: string;
  name: string;
  categoria: number;
  observaciones: string;
  activo: boolean;
  price: string;
  cost: string;
  minStock: string;
  stock: string;
  unit: number | null;
  supplier: string;
  fechaCaducidad: string;
  marca: string;
  volumen: string;
  unidadVenta: string;
  retornable: boolean;
  tipoEmpanada: string;
  costoProduccion: string;
  tiempoPreparacion: string;
  unidadVentaEmpanada: string;
  imagenUrl: string;
  lote: string;
  descuentaAutomatico: boolean;
  tipoAlimento: string;
  costoPreparacion: string;
  tiempoPreparacionOtro: string;
  unidadVentaOtro: string;
  mermaPorcentaje: string;
  rendimientoReceta: string;
}

interface AddProductDialogProps {
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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

const REQUIRED_MESSAGE = "Este campo es obligatorio.";

export default function AddProductDialog({ onProductAdded }: AddProductDialogProps) {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const closeDialog = () => setIsDialogOpen(false);

  const initialProduct: NewProduct = {
    codigo: "",
    name: "",
    categoria: 0,
    observaciones: "",
    activo: true,
    price: "",
    cost: "",
    minStock: "",
    stock: "",
    unit: null,
    supplier: "",
    fechaCaducidad: "",
    marca: "",
    volumen: "",
    unidadVenta: "",
    retornable: false,
    tipoEmpanada: "",
    costoProduccion: "",
    tiempoPreparacion: "",
    unidadVentaEmpanada: "",
    imagenUrl: "",
    lote: "",
    descuentaAutomatico: true,
    tipoAlimento: "",
    costoPreparacion: "",
    tiempoPreparacionOtro: "",
    unidadVentaOtro: "",
    mermaPorcentaje: "0",
    rendimientoReceta: "1",
  };

  const {
    values: newProduct,
    setValues: setNewProduct,
    handleChange,
  } = useFormFields<NewProduct>(initialProduct, {
    codigo: (v: unknown) => ((v as string)?.trim() ? null : REQUIRED_MESSAGE),
    name: (v: unknown) => ((v as string)?.trim() ? null : REQUIRED_MESSAGE),
    categoria: (v: unknown) => ((v as number) > 0 ? null : REQUIRED_MESSAGE)
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

  const getId = useCallback((abbr: string) => unitsData.find(u => u.abreviatura === abbr)?.id ?? null, [unitsData]);
  const defaultWeightUnit = useMemo(() => getId("kg") ?? getId("g") ?? getId("lb") ?? null, [getId]);

  const selectedCategory = categoriesData.find(c => c.id === newProduct.categoria);
  const normalizedCategory = translateCategory(selectedCategory?.nombre_categoria ?? "").toLowerCase();
  const isIngredientCategory = normalizedCategory.includes("ingred");
  const isBeverageCategory = normalizedCategory.includes("bebida");
  const isEmpanadaCategory = normalizedCategory.includes("empanada");
  const isOtherPreparedCategory = normalizedCategory.includes("preparado") || normalizedCategory.includes("otro");
  const defaultAccordionValue = useMemo(() => {
    if (isBeverageCategory) return "bebidas";
    if (isEmpanadaCategory) return "empanadas";
    if (isIngredientCategory) return "ingredientes";
    if (isOtherPreparedCategory) return "otros";
    return undefined;
  }, [isBeverageCategory, isEmpanadaCategory, isIngredientCategory, isOtherPreparedCategory]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIngredients([]);
      setCurrentIng({ ingrediente: 0, cantidad: "" });
      setPossibleUnits(null);
      setNewProduct((np) => {
        const updated: Partial<NewProduct> = { ...np };
        if (isIngredientCategory) {
          if (!np.unit && defaultWeightUnit) {
            updated.unit = defaultWeightUnit;
          }
          updated.minStock = np.minStock || "";
        } else {
          updated.unit = getId("u") ?? np.unit;
          updated.minStock = np.minStock || (isBeverageCategory || isOtherPreparedCategory ? "" : "0");
        }
        if (isEmpanadaCategory) {
          updated.stock = "0";
        } else if (!isBeverageCategory && !isOtherPreparedCategory) {
          updated.stock = "";
        }
        return updated as NewProduct;
      });
    }, 40);

    return () => clearTimeout(timeout);
  }, [newProduct.categoria, isIngredientCategory, isBeverageCategory, isOtherPreparedCategory, isEmpanadaCategory, defaultWeightUnit, getId, setNewProduct]);

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

  const parseNumber = (value: string) => {
    const num = parseFloat(value);
    return Number.isFinite(num) ? num : null;
  };

    const effectiveCost = useMemo(() => {
    if (isEmpanadaCategory) return parseNumber(newProduct.costoProduccion) ?? 0;
    if (isOtherPreparedCategory) return parseNumber(newProduct.costoPreparacion) ?? 0;
    return parseNumber(newProduct.cost) ?? 0;
  }, [isEmpanadaCategory, isOtherPreparedCategory, newProduct.cost, newProduct.costoPreparacion, newProduct.costoProduccion]);

  const effectivePrice = useMemo(() => {
    if (isIngredientCategory) return effectiveCost;
    return parseNumber(newProduct.price) ?? 0;
  }, [effectiveCost, isIngredientCategory, newProduct.price]);

  const margin = useMemo(() => {
    if (effectiveCost <= 0 || effectivePrice <= 0 || isIngredientCategory) return null;
    return ((effectivePrice - effectiveCost) / effectiveCost) * 100;
  }, [effectiveCost, effectivePrice, isIngredientCategory]);

  const validationResult = useMemo(() => {
    const errors: Record<string, string> = {};

    if (!newProduct.codigo.trim()) errors.codigo = REQUIRED_MESSAGE;
    if (!newProduct.name.trim()) errors.name = REQUIRED_MESSAGE;
    if (!newProduct.categoria) errors.categoria = REQUIRED_MESSAGE;

    if (isBeverageCategory) {
      if (!newProduct.marca.trim()) errors.marca = REQUIRED_MESSAGE;
      if (!newProduct.volumen.trim()) errors.volumen = REQUIRED_MESSAGE;
      if (!newProduct.unidadVenta.trim()) errors.unidadVenta = REQUIRED_MESSAGE;
      if (!newProduct.price || effectivePrice <= 0) errors.price = "Precio de venta requerido.";
      if (!newProduct.cost || effectiveCost <= 0) errors.cost = "Costo requerido.";
      const stockVal = parseNumber(newProduct.stock) ?? 0;
      if (stockVal <= 0) errors.stock = "Debes definir el stock actual.";
      const minStockVal = parseNumber(newProduct.minStock) ?? 0;
      if (minStockVal <= 0) errors.minStock = "Define un stock mínimo.";
    } else if (isEmpanadaCategory) {
      if (!newProduct.tipoEmpanada.trim()) errors.tipoEmpanada = REQUIRED_MESSAGE;
      if (!newProduct.unidadVentaEmpanada.trim()) errors.unidadVentaEmpanada = REQUIRED_MESSAGE;
      if (!newProduct.price || effectivePrice <= 0) errors.price = "Precio de venta requerido.";
      if (!newProduct.costoProduccion || effectiveCost <= 0) errors.costoProduccion = "Costo de producción requerido.";
      if (ingredients.length === 0) errors.ingredientes = "Asocia al menos un ingrediente.";
    } else if (isIngredientCategory) {
      if (!newProduct.unit) errors.unit = "Selecciona una unidad base.";
      const stockVal = parseNumber(newProduct.stock) ?? 0;
      if (stockVal <= 0) errors.stock = "El stock inicial es obligatorio.";
      const minStockVal = parseNumber(newProduct.minStock) ?? 0;
      if (minStockVal <= 0) errors.minStock = "Define un stock mínimo.";
      if (!newProduct.cost || effectiveCost <= 0) errors.cost = "Costo por unidad requerido.";
      if (!newProduct.supplier.trim()) errors.supplier = "Indica el proveedor.";
      if (!newProduct.fechaCaducidad) errors.fechaCaducidad = "Ingresa la fecha de vencimiento.";
    } else if (isOtherPreparedCategory) {
      if (!newProduct.tipoAlimento.trim()) errors.tipoAlimento = REQUIRED_MESSAGE;
      if (!newProduct.unidadVentaOtro.trim()) errors.unidadVentaOtro = REQUIRED_MESSAGE;
      if (!newProduct.price || effectivePrice <= 0) errors.price = "Precio de venta requerido.";
      if (!newProduct.costoPreparacion || effectiveCost <= 0) errors.costoPreparacion = "Costo de preparación requerido.";
      const stockVal = parseNumber(newProduct.stock) ?? 0;
      if (stockVal <= 0) errors.stock = "Define un stock inicial.";
      const minStockVal = parseNumber(newProduct.minStock) ?? 0;
      if (minStockVal <= 0) errors.minStock = "Define un stock mínimo.";
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }, [
    effectiveCost,
    effectivePrice,
    ingredients.length,
    isBeverageCategory,
    isEmpanadaCategory,
    isIngredientCategory,
    isOtherPreparedCategory,
    newProduct.categoria,
    newProduct.codigo,
    newProduct.cost,
    newProduct.costoPreparacion,
    newProduct.costoProduccion,
    newProduct.name,
    newProduct.fechaCaducidad,
    newProduct.marca,
    newProduct.minStock,
    newProduct.price,
    newProduct.stock,
    newProduct.tipoAlimento,
    newProduct.tipoEmpanada,
    newProduct.unit,
    newProduct.supplier,
    newProduct.unidadVenta,
    newProduct.unidadVentaEmpanada,
    newProduct.unidadVentaOtro,
    newProduct.volumen,
  ]);

  const buildDescripcion = () => {
    const details: string[] = [];
    if (newProduct.observaciones.trim()) details.push(newProduct.observaciones.trim());

    if (isBeverageCategory) {
      if (newProduct.marca.trim()) details.push(`Marca: ${newProduct.marca}`);
      if (newProduct.volumen.trim()) details.push(`Volumen: ${newProduct.volumen}`);
      if (newProduct.unidadVenta.trim()) details.push(`Unidad de venta: ${newProduct.unidadVenta}`);
      details.push(`Retornable: ${newProduct.retornable ? "Sí" : "No"}`);
    }

    if (isEmpanadaCategory) {
      if (newProduct.tipoEmpanada.trim()) details.push(`Tipo de empanada: ${newProduct.tipoEmpanada}`);
      if (newProduct.unidadVentaEmpanada.trim()) details.push(`Unidad de venta: ${newProduct.unidadVentaEmpanada}`);
      if (newProduct.tiempoPreparacion.trim()) details.push(`Tiempo de preparación: ${newProduct.tiempoPreparacion}`);
    }

    if (isIngredientCategory) {
      if (newProduct.lote.trim()) details.push(`Lote: ${newProduct.lote}`);
      details.push(`Descuento automático en producción: ${newProduct.descuentaAutomatico ? "Sí" : "No"}`);
    }

    if (isOtherPreparedCategory) {
      if (newProduct.tipoAlimento.trim()) details.push(`Tipo: ${newProduct.tipoAlimento}`);
      if (newProduct.unidadVentaOtro.trim()) details.push(`Unidad de venta: ${newProduct.unidadVentaOtro}`);
      if (newProduct.tiempoPreparacionOtro.trim()) details.push(`Tiempo de preparación: ${newProduct.tiempoPreparacionOtro}`);
    }

    return details.join(" | ");
  };

  const handleAddProduct = async () => {
    const validation = validationResult;
    if (!validation.valid) {
      const firstError = Object.values(validation.errors)[0];
      toast({
        title: "Revisa el formulario",
        description: firstError || "Hay campos pendientes por completar.",
        variant: "destructive",
      });
      return;
    }

    const categoriaId = newProduct.categoria;
    const price = effectivePrice;
    const cost = effectiveCost;

    const marginValue = cost > 0 ? (price - cost) / cost : 1;
    if (!isIngredientCategory && marginValue < 0.15) {
      toast({
        title: "Alerta de margen",
        description: "El precio genera un margen bajo frente al costo.",
      });
    }

    const payload: Record<string, unknown> = {
      codigo: newProduct.codigo.trim(),
      nombre: newProduct.name.trim(),
      descripcion: buildDescripcion(),
      categoria: categoriaId,
      activo: newProduct.activo,
      precio: price,
      costo: cost,
      impuesto: 0,
      descuento_base: 0,
      unidad_empaque: 1,
      merma_porcentaje: parseFloat(newProduct.mermaPorcentaje) || 0,
      rendimiento_receta: parseFloat(newProduct.rendimientoReceta) || 1,
      proveedor: newProduct.supplier || undefined,
      imagen_url: newProduct.imagenUrl || undefined,
      fecha_caducidad: newProduct.fechaCaducidad || null,
    };

    if (isIngredientCategory) {
      payload.tipo = "ingredientes";
      payload.unidad_media = newProduct.unit;
      payload.stock_actual = parseFloat(newProduct.stock) || 0;
      payload.stock_minimo = parseFloat(newProduct.minStock) || 0;
      payload.stock_seguridad = parseFloat(newProduct.minStock) || 0;
    } else if (isBeverageCategory) {
      payload.tipo = "bebida";
      payload.unidad_media = getId("u");
      payload.stock_actual = parseFloat(newProduct.stock) || 0;
      payload.stock_minimo = parseFloat(newProduct.minStock) || 0;
    } else if (isEmpanadaCategory) {
      payload.tipo = "empanada";
      payload.unidad_media = getId("u");
      payload.stock_actual = 0;
      payload.stock_minimo = parseFloat(newProduct.minStock) || 0;
      payload.ingredientes = ingredients.map((ing) => ({
        ingrediente: ing.ingrediente,
        cantidad_requerida: parseFloat(ing.cantidad) || 0,
      }));
    } else if (isOtherPreparedCategory) {
      payload.tipo = "producto_final";
      payload.unidad_media = getId("u");
      payload.stock_actual = parseFloat(newProduct.stock) || 0;
      payload.stock_minimo = parseFloat(newProduct.minStock) || 0;
      if (ingredients.length > 0) {
        payload.ingredientes = ingredients.map((ing) => ({
          ingrediente: ing.ingrediente,
          cantidad_requerida: parseFloat(ing.cantidad) || 0,
        }));
      }
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
          tipo: created.tipo,
          categoria: parseInt(String(created.categoria)),
          categoria_nombre: created.categoria_nombre ?? "Sin categoría",
          price: parseFloat(String(created.precio)),
          cost: parseFloat(String(created.costo ?? 0)),
          stock: parseFloat(String(created.stock_actual)),
          minStock: parseFloat(String(created.stock_minimo)),
          unit: created.unidad_media_abreviatura,
          unitId: created.unidad_media,
          supplier: created.proveedor_nombre ?? String(created.proveedor ?? ""),
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

  const renderIngredientComposer = (required: boolean) => (
    <div className="space-y-4">
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

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label className="mb-0">Ingredientes {required ? "(requerido)" : "(opcional)"}</Label>
          <FieldError message={validationResult.errors.ingredientes} />
        </div>
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
    </div>
  );

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
          className="sm:max-w-5xl max-h-[85vh] overflow-y-auto p-0"
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
                        aria-invalid={!!validationResult.errors.codigo}
                      />
                      <FieldError message={validationResult.errors.codigo} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="name">Nombre del Producto*</Label>
                      <Input
                        id="name"
                        required
                        value={newProduct.name}
                        onChange={(e) => handleChange("name", e.target.value)}
                        placeholder="Ej: Empanada de Carne"
                        aria-invalid={!!validationResult.errors.name}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="observaciones">Observaciones internas (opcional)</Label>
                    <Textarea
                      id="observaciones"
                      value={newProduct.observaciones}
                      onChange={(e) => handleChange("observaciones", e.target.value)}
                      placeholder="Notas internas o consideraciones del producto"
                    />
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
                      <FieldError message={validationResult.errors.categoria} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="activo">Estado</Label>
                      <div className="flex items-center justify-between rounded-md border bg-background p-3">
                        <div>
                          <p className="text-sm font-medium">Activo</p>
                          <p className="text-xs text-muted-foreground">Disponible para vender y usar en recetas.</p>
                        </div>
                        <Switch id="activo" checked={newProduct.activo} onCheckedChange={(checked) => handleChange("activo", checked)} />
                      </div>
                    </div>
                  </div>
                </Section>

                {newProduct.categoria === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Selecciona una categoría para ver los campos específicos.
                  </p>
                ) : (
                  <Accordion type="single" collapsible defaultValue={defaultAccordionValue}>
                    {isBeverageCategory && (
                      <AccordionItem value="bebidas">
                        <AccordionTrigger>Detalle para Bebidas</AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                              <Label htmlFor="marca">Marca</Label>
                              <Input
                                id="marca"
                                value={newProduct.marca}
                                onChange={(e) => handleChange("marca", e.target.value)}
                                aria-invalid={!!validationResult.errors.marca}
                              />
                              <FieldError message={validationResult.errors.marca} />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="volumen">Volumen (ml o L)</Label>
                              <Input
                                id="volumen"
                                value={newProduct.volumen}
                                onChange={(e) => handleChange("volumen", e.target.value)}
                                placeholder="Ej: 500 ml"
                                aria-invalid={!!validationResult.errors.volumen}
                              />
                              <FieldError message={validationResult.errors.volumen} />
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                              <Label htmlFor="unidadVenta">Unidad de venta</Label>
                              <Input
                                id="unidadVenta"
                                value={newProduct.unidadVenta}
                                onChange={(e) => handleChange("unidadVenta", e.target.value)}
                                placeholder="Botella, lata, vaso"
                                aria-invalid={!!validationResult.errors.unidadVenta}
                              />
                              <FieldError message={validationResult.errors.unidadVenta} />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="fechaCaducidadBebida">Fecha de vencimiento (opcional)</Label>
                              <Input
                                id="fechaCaducidadBebida"
                                type="date"
                                value={newProduct.fechaCaducidad}
                                onChange={(e) => handleChange("fechaCaducidad", e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="grid gap-2">
                              <Label htmlFor="price">Precio de venta</Label>
                              <Input
                                id="price"
                                type="number"
                                step="0.01"
                                min={0}
                                required
                                value={newProduct.price}
                                onChange={(e) => handleChange("price", e.target.value)}
                                aria-invalid={!!validationResult.errors.price}
                              />
                              <FieldError message={validationResult.errors.price} />
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
                                aria-invalid={!!validationResult.errors.cost}
                              />
                              <FieldError message={validationResult.errors.cost} />
                            </div>
                            <div className="grid gap-2">
                              <Label>Margen estimado</Label>
                              <p className="rounded-md border bg-background px-3 py-2 text-sm">
                                {margin !== null ? `${margin.toFixed(1)}%` : "Completa precio y costo"}
                              </p>
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                              <Label htmlFor="stockBebida">Stock actual</Label>
                              <Input
                                id="stockBebida"
                                type="number"
                                min={0}
                                value={newProduct.stock}
                                onChange={(e) => handleChange("stock", e.target.value)}
                                aria-invalid={!!validationResult.errors.stock}
                              />
                              <FieldError message={validationResult.errors.stock} />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="minStockBebida">Stock mínimo</Label>
                              <Input
                                id="minStockBebida"
                                type="number"
                                min={0}
                                value={newProduct.minStock}
                                onChange={(e) => handleChange("minStock", e.target.value)}
                                aria-invalid={!!validationResult.errors.minStock}
                              />
                              <FieldError message={validationResult.errors.minStock} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between rounded-md border bg-background p-3">
                            <div>
                              <Label htmlFor="retornable" className="font-medium">¿Es retornable?</Label>
                              <p className="text-xs text-muted-foreground">Marca si el envase se devuelve.</p>
                            </div>
                            <Switch id="retornable" checked={newProduct.retornable} onCheckedChange={(checked) => handleChange("retornable", checked)} />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {isEmpanadaCategory && (
                      <AccordionItem value="empanadas">
                        <AccordionTrigger>Detalle para Empanadas</AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                              <Label htmlFor="tipoEmpanada">Tipo de empanada</Label>
                              <Input
                                id="tipoEmpanada"
                                value={newProduct.tipoEmpanada}
                                onChange={(e) => handleChange("tipoEmpanada", e.target.value)}
                                placeholder="Carne, pollo, queso..."
                                aria-invalid={!!validationResult.errors.tipoEmpanada}
                              />
                              <FieldError message={validationResult.errors.tipoEmpanada} />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="unidadVentaEmpanada">Unidad de venta</Label>
                              <Input
                                id="unidadVentaEmpanada"
                                value={newProduct.unidadVentaEmpanada}
                                onChange={(e) => handleChange("unidadVentaEmpanada", e.target.value)}
                                placeholder="Unidad o combo"
                                aria-invalid={!!validationResult.errors.unidadVentaEmpanada}
                              />
                              <FieldError message={validationResult.errors.unidadVentaEmpanada} />
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="grid gap-2">
                              <Label htmlFor="priceEmpanada">Precio de venta</Label>
                              <Input
                                id="priceEmpanada"
                                type="number"
                                step="0.01"
                                min={0}
                                value={newProduct.price}
                                onChange={(e) => handleChange("price", e.target.value)}
                                aria-invalid={!!validationResult.errors.price}
                              />
                              <FieldError message={validationResult.errors.price} />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="costoProduccion">Costo de producción</Label>
                              <Input
                                id="costoProduccion"
                                type="number"
                                step="0.01"
                                min={0}
                                value={newProduct.costoProduccion}
                                onChange={(e) => handleChange("costoProduccion", e.target.value)}
                                aria-invalid={!!validationResult.errors.costoProduccion}
                              />
                              <FieldError message={validationResult.errors.costoProduccion} />
                            </div>
                            <div className="grid gap-2">
                              <Label>Margen estimado</Label>
                              <p className="rounded-md border bg-background px-3 py-2 text-sm">
                                {margin !== null ? `${margin.toFixed(1)}%` : "Completa precio y costo"}
                              </p>
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                              <Label htmlFor="tiempoPreparacion">Tiempo de preparación</Label>
                              <Input
                                id="tiempoPreparacion"
                                value={newProduct.tiempoPreparacion}
                                onChange={(e) => handleChange("tiempoPreparacion", e.target.value)}
                                placeholder="Ej: 8 minutos"
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="imagenUrl">Imagen del producto (opcional)</Label>
                              <Input
                                id="imagenUrl"
                                value={newProduct.imagenUrl}
                                onChange={(e) => handleChange("imagenUrl", e.target.value)}
                                placeholder="https://..."
                              />
                            </div>
                          </div>
                          {renderIngredientComposer(true)}
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {isIngredientCategory && (
                      <AccordionItem value="ingredientes">
                        <AccordionTrigger>Detalle para Ingredientes</AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                              <Label htmlFor="unit">Unidad de medida base</Label>
                              <Select
                                value={newProduct.unit ? String(newProduct.unit) : ""}
                                onValueChange={(val) => handleChange("unit", Number(val))}
                              >
                                <SelectTrigger id="unit">
                                  <SelectValue placeholder="Unidad" />
                                </SelectTrigger>
                                <SelectContent>
                                  {unitsData
                                    .filter(u => ["kg", "g", "lb", "l", "ml"].includes(u.abreviatura.toLowerCase()) || u.abreviatura === "u")
                                    .map(u => (
                                      <SelectItem key={u.id} value={String(u.id)}>{u.nombre} ({u.abreviatura})</SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                              <FieldError message={validationResult.errors.unit} />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="supplier">Proveedor</Label>
                              <Input
                                id="supplier"
                                value={newProduct.supplier}
                                onChange={(e) => handleChange("supplier", e.target.value)}
                                placeholder="Nombre del proveedor"
                                aria-invalid={!!validationResult.errors.supplier}
                              />
                              <FieldError message={validationResult.errors.supplier} />
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="grid gap-2">
                              <Label htmlFor="stockIngrediente">Stock actual</Label>
                              <Input
                                id="stockIngrediente"
                                type="number"
                                min={0}
                                value={newProduct.stock}
                                onChange={(e) => handleChange("stock", e.target.value)}
                                aria-invalid={!!validationResult.errors.stock}
                              />
                              <FieldError message={validationResult.errors.stock} />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="minStockIngrediente">Stock mínimo</Label>
                              <Input
                                id="minStockIngrediente"
                                type="number"
                                min={0}
                                value={newProduct.minStock}
                                onChange={(e) => handleChange("minStock", e.target.value)}
                                aria-invalid={!!validationResult.errors.minStock}
                              />
                              <FieldError message={validationResult.errors.minStock} />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="costIngrediente">Costo por unidad de medida</Label>
                              <Input
                                id="costIngrediente"
                                type="number"
                                step="0.01"
                                min={0}
                                value={newProduct.cost}
                                onChange={(e) => handleChange("cost", e.target.value)}
                                aria-invalid={!!validationResult.errors.cost}
                              />
                              <FieldError message={validationResult.errors.cost} />
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                              <Label htmlFor="fechaCaducidad">Fecha de vencimiento</Label>
                              <Input
                                id="fechaCaducidad"
                                type="date"
                                value={newProduct.fechaCaducidad}
                                onChange={(e) => handleChange("fechaCaducidad", e.target.value)}
                                aria-invalid={!!validationResult.errors.fechaCaducidad}
                              />
                              <FieldError message={validationResult.errors.fechaCaducidad} />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="lote">Lote (opcional)</Label>
                              <Input
                                id="lote"
                                value={newProduct.lote}
                                onChange={(e) => handleChange("lote", e.target.value)}
                                placeholder="Código de lote"
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between rounded-md border bg-background p-3">
                            <div>
                              <Label htmlFor="descuentaAutomatico" className="font-medium">
                                ¿Se descuenta automáticamente al producir empanadas?
                              </Label>
                              <p className="text-xs text-muted-foreground">Controla el consumo automático al producir.</p>
                            </div>
                            <Switch id="descuentaAutomatico" checked={newProduct.descuentaAutomatico} onCheckedChange={(checked) => handleChange("descuentaAutomatico", checked)} />
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                    {isOtherPreparedCategory && (
                      <AccordionItem value="otros">
                        <AccordionTrigger>Detalle para Otros alimentos preparados</AccordionTrigger>
                        <AccordionContent className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                              <Label htmlFor="tipoAlimento">Tipo de alimento</Label>
                              <Input
                                id="tipoAlimento"
                                value={newProduct.tipoAlimento}
                                onChange={(e) => handleChange("tipoAlimento", e.target.value)}
                                placeholder="Arepa, pastel, combo..."
                                aria-invalid={!!validationResult.errors.tipoAlimento}
                              />
                              <FieldError message={validationResult.errors.tipoAlimento} />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="unidadVentaOtro">Unidad de venta</Label>
                              <Input
                                id="unidadVentaOtro"
                                value={newProduct.unidadVentaOtro}
                                onChange={(e) => handleChange("unidadVentaOtro", e.target.value)}
                                placeholder="Unidad, porción, combo"
                                aria-invalid={!!validationResult.errors.unidadVentaOtro}
                              />
                              <FieldError message={validationResult.errors.unidadVentaOtro} />
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="grid gap-2">
                              <Label htmlFor="priceOtro">Precio de venta</Label>
                              <Input
                                id="priceOtro"
                                type="number"
                                step="0.01"
                                min={0}
                                value={newProduct.price}
                                onChange={(e) => handleChange("price", e.target.value)}
                                aria-invalid={!!validationResult.errors.price}
                              />
                              <FieldError message={validationResult.errors.price} />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="costoPreparacion">Costo de preparación</Label>
                              <Input
                                id="costoPreparacion"
                                type="number"
                                step="0.01"
                                min={0}
                                value={newProduct.costoPreparacion}
                                onChange={(e) => handleChange("costoPreparacion", e.target.value)}
                                aria-invalid={!!validationResult.errors.costoPreparacion}
                              />
                              <FieldError message={validationResult.errors.costoPreparacion} />
                            </div>
                            <div className="grid gap-2">
                              <Label>Margen estimado</Label>
                              <p className="rounded-md border bg-background px-3 py-2 text-sm">
                                {margin !== null ? `${margin.toFixed(1)}%` : "Completa precio y costo"}
                              </p>
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-3">
                            <div className="grid gap-2">
                              <Label htmlFor="stockOtro">Stock actual</Label>
                              <Input
                                id="stockOtro"
                                type="number"
                                min={0}
                                value={newProduct.stock}
                                onChange={(e) => handleChange("stock", e.target.value)}
                                aria-invalid={!!validationResult.errors.stock}
                              />
                              <FieldError message={validationResult.errors.stock} />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="minStockOtro">Stock mínimo</Label>
                              <Input
                                id="minStockOtro"
                                type="number"
                                min={0}
                                value={newProduct.minStock}
                                onChange={(e) => handleChange("minStock", e.target.value)}
                                aria-invalid={!!validationResult.errors.minStock}
                              />
                              <FieldError message={validationResult.errors.minStock} />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="fechaCaducidadOtro">Fecha de vencimiento (si aplica)</Label>
                              <Input
                                id="fechaCaducidadOtro"
                                type="date"
                                value={newProduct.fechaCaducidad}
                                onChange={(e) => handleChange("fechaCaducidad", e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="grid gap-2">
                              <Label htmlFor="tiempoPreparacionOtro">Tiempo de preparación (opcional)</Label>
                              <Input
                                id="tiempoPreparacionOtro"
                                value={newProduct.tiempoPreparacionOtro}
                                onChange={(e) => handleChange("tiempoPreparacionOtro", e.target.value)}
                                placeholder="Ej: 5 minutos"
                              />
                            </div>
                          </div>
                          {renderIngredientComposer(false)}
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                )}
              </div>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background px-6 py-4">
              <Button variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button onClick={handleAddProduct} className="bg-primary hover:bg-primary/90" disabled={!validationResult.valid}>
                Agregar Producto
              </Button>
            </div>
          </div>
        </DialogContent>
      </ErrorBoundary>
    </Dialog>
  );
}