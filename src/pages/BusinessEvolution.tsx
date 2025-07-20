import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useBusinessEvolution } from "../hooks/useBusinessEvolution";
import { fetchCategories } from "../utils/api";
import { formatCurrency } from "../utils/formatCurrency";
import { Skeleton } from "../components/ui/skeleton";

export default function BusinessEvolution() {
  const [period, setPeriod] = useState("month");
  const [category, setCategory] = useState<string | undefined>();

  const {
    data = [],
    isLoading,
    isError,
  } = useBusinessEvolution(period, { category });

  const {
    data: categories = [],
    isLoading: catLoading,
    isError: catError,
  } = useQuery<{ id: number; nombre_categoria: string }[]>({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: Infinity,
  });

  if (isLoading || catLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError || catError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <p className="text-destructive">Error al cargar los datos de evolución.</p>
      </div>
    );
  }

  // ✅ Preparar los datos con la propiedad 'label' para el eje X
  const chartData = data.map((d) => ({
    ...d,
    label: d.period.slice(0, 7),
  }));

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Evolución del Negocio</h1>
        <p className="text-muted-foreground">Métricas y proyecciones</p>
      </div>

      <div className="flex gap-4 mb-6 flex-wrap">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Mensual</SelectItem>
            <SelectItem value="quarter">Trimestral</SelectItem>
          </SelectContent>
        </Select>

        <Select value={category ?? ""} onValueChange={(v) => setCategory(v || undefined)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todas</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.nombre_categoria}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {chartData.length === 0 ? (
        <p className="text-muted-foreground">No hay datos disponibles para mostrar.</p>
      ) : (
        <>
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Ingresos Netos</CardTitle>
              <CardDescription>Evolución y proyección</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
                    <XAxis dataKey="label" />
                    <YAxis yAxisId="left" tickFormatter={(v) => formatCurrency(Number(v))} />
                    <YAxis orientation="right" yAxisId="right" hide />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="net_income" stroke="hsl(var(--primary))" yAxisId="left" />
                    <Line type="monotone" dataKey="growth" stroke="hsl(var(--golden))" yAxisId="right" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ventas y Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" />
                    <Line type="monotone" dataKey="new_clients" stroke="hsl(var(--secondary))" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
