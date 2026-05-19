import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useBusinessEvolution } from "../hooks/useBusinessEvolution";
import { fetchCategories } from "../utils/api";
import { formatCurrency } from "../utils/formatCurrency";
import { Skeleton } from "../components/ui/skeleton";
import { TrendingUp, Users, DollarSign, BarChart2 } from "lucide-react";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";

export default function BusinessEvolution() {
  const [period, setPeriod] = useState("month");
  const [category, setCategory] = useState("all");

  const { data = [], isLoading, isError } = useBusinessEvolution(period, {
    category: category === "all" ? undefined : category,
  });

  const { data: categories = [], isLoading: catLoading, isError: catError } = useQuery<
    { id: number; nombre_categoria: string }[]
  >({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    staleTime: Infinity,
  });

  if (isLoading || catLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (isError || catError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <TrendingUp className="w-7 h-7 text-destructive" />
          </div>
          <h3 className="text-base font-semibold mb-1">Error al cargar datos</h3>
          <p className="text-sm text-muted-foreground">No se pudo cargar la evolución del negocio.</p>
        </div>
      </div>
    );
  }

  const chartData = data.map((d) => ({ ...d, label: d.period.slice(0, 7) }));

  const latest = chartData[chartData.length - 1];
  const prev = chartData[chartData.length - 2];
  const incomeChange = latest && prev && prev.net_income
    ? ((latest.net_income - prev.net_income) / Math.abs(prev.net_income)) * 100
    : null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evolución del Negocio</h1>
          <p className="text-muted-foreground text-sm mt-1">Métricas y proyecciones por periodo</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mensual</SelectItem>
              <SelectItem value="quarter">Trimestral</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nombre_categoria}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI chips */}
      {latest && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-emerald-50 dark:bg-emerald-950/40">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ingreso neto</p>
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(latest.net_income ?? 0)}</p>
              {incomeChange !== null && (
                <p className={`text-xs mt-1 ${incomeChange >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {incomeChange >= 0 ? "+" : ""}{incomeChange.toFixed(1)}% vs periodo anterior
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-950/40">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ventas</p>
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/60">
                  <BarChart2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{latest.sales ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Último periodo</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-purple-50 dark:bg-purple-950/40">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Nuevos clientes</p>
                <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/60">
                  <Users className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{latest.new_clients ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Último periodo</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-amber-50 dark:bg-amber-950/40">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Crecimiento</p>
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
                {latest.growth != null ? `${Number(latest.growth).toFixed(1)}%` : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Tasa de crecimiento</p>
            </CardContent>
          </Card>
        </div>
      )}

      <ErrorBoundary label="Error al cargar gráficos de evolución">
      {chartData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <TrendingUp className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">Sin datos disponibles</h3>
          <p className="text-sm text-muted-foreground">No hay datos para el periodo y categoría seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ingresos Netos y Crecimiento</CardTitle>
              <CardDescription>Evolución del ingreso neto por periodo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tickFormatter={(v) => formatCurrency(Number(v))} tick={{ fontSize: 11 }} width={80} />
                    <YAxis orientation="right" yAxisId="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} width={40} />
                    <Tooltip formatter={(v: number, name: string) => [name === "growth" ? `${Number(v).toFixed(1)}%` : formatCurrency(v), name === "growth" ? "Crecimiento" : "Ingreso neto"]} />
                    <Legend formatter={(value) => value === "net_income" ? "Ingreso neto" : "Crecimiento %"} />
                    <Line type="monotone" dataKey="net_income" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} yAxisId="left" />
                    <Line type="monotone" dataKey="growth" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} yAxisId="right" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ventas y Nuevos Clientes</CardTitle>
              <CardDescription>Volumen de ventas y captación de clientes por periodo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} width={40} />
                    <Tooltip />
                    <Legend formatter={(value) => value === "sales" ? "Ventas" : "Nuevos clientes"} />
                    <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="new_clients" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      </ErrorBoundary>
    </div>
  );
}
