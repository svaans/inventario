import { useMonthlyTrends } from "../hooks/useMonthlyTrends";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Download, Printer, TrendingDown, Package, ShoppingCart, DollarSign } from "lucide-react";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import { formatCurrency } from "../utils/formatCurrency";

const CATEGORY_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#a855f7", "#f43f5e", "#06b6d4"];

export default function MonthlyTrends() {
  const { data, isLoading } = useMonthlyTrends();

  const stockData = (() => {
    const map: Record<string, { period: string; productos: number; insumos: number }> = {};
    data?.stock?.forEach((s) => {
      if (!map[s.period]) map[s.period] = { period: s.period.slice(0, 7), productos: 0, insumos: 0 };
      if (s.ingrediente) map[s.period].insumos += s.neto;
      else map[s.period].productos += s.neto;
    });
    return Object.values(map).sort((a, b) => a.period.localeCompare(b.period));
  })();

  const salesData = (() => {
    const grouped: Record<string, Record<string, number>> = {};
    data?.sales?.forEach((s) => {
      const p = s.period.slice(0, 7);
      grouped[p] = grouped[p] || {};
      grouped[p][s.categoria] = (grouped[p][s.categoria] || 0) + s.total;
    });
    return Object.entries(grouped)
      .map(([period, cats]) => ({ period, ...cats }))
      .sort((a, b) => a.period.localeCompare(b.period));
  })();

  const salesCategories = salesData.length > 0
    ? Object.keys(salesData[0]).filter((k) => k !== "period")
    : [];

  const lossData = data?.losses?.map((l) => ({ period: l.period.slice(0, 7), loss: l.loss })) ?? [];
  const priceData = data?.prices?.map((p) => ({ period: p.period.slice(0, 7), precio: p.precio_promedio })) ?? [];

  const totalLoss = lossData.reduce((sum, d) => sum + (d.loss ?? 0), 0);
  const latestPrice = priceData[priceData.length - 1]?.precio ?? 0;
  const latestStock = stockData[stockData.length - 1];

  const exportCsv = () => {
    const rows = ["period,productos,insumos", ...stockData.map((d) => `${d.period},${d.productos},${d.insumos}`)];
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tendencias.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8 print:bg-white">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tendencias Mensuales</h1>
          <p className="text-muted-foreground text-sm mt-1">Análisis de stock, ventas, devoluciones y precios</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button size="sm" variant="outline" onClick={exportCsv} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5">
            <Printer className="w-3.5 h-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* KPI chips */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-950/40">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stock productos</p>
              <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/60">
                <Package className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{latestStock?.productos ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Último periodo</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-emerald-50 dark:bg-emerald-950/40">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Stock insumos</p>
              <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60">
                <ShoppingCart className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{latestStock?.insumos ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Último periodo</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-red-50 dark:bg-red-950/40">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pérdidas totales</p>
              <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/60">
                <TrendingDown className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-red-700 dark:text-red-300">{formatCurrency(totalLoss)}</p>
            <p className="text-xs text-muted-foreground mt-1">Por devoluciones</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-amber-50 dark:bg-amber-950/40">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Precio insumos</p>
              <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60">
                <DollarSign className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{formatCurrency(latestPrice)}</p>
            <p className="text-xs text-muted-foreground mt-1">Promedio último periodo</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <ErrorBoundary label="Error al cargar gráficos de tendencias">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stock por tipo</CardTitle>
            <CardDescription>Evolución de productos vs insumos en stock</CardDescription>
          </CardHeader>
          <CardContent>
            {stockData.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stockData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={40} />
                    <Tooltip />
                    <Legend formatter={(v) => v === "productos" ? "Productos" : "Insumos"} />
                    <Line type="monotone" dataKey="productos" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="insumos" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ventas por categoría</CardTitle>
            <CardDescription>Ingresos segmentados por categoría de producto</CardDescription>
          </CardHeader>
          <CardContent>
            {salesData.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={salesData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => formatCurrency(Number(v))} tick={{ fontSize: 11 }} width={70} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Legend />
                    {salesCategories.map((cat, i) => (
                      <Line key={cat} type="monotone" dataKey={cat} stroke={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pérdidas por devoluciones</CardTitle>
            <CardDescription>Impacto financiero de las devoluciones por periodo</CardDescription>
          </CardHeader>
          <CardContent>
            {lossData.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lossData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => formatCurrency(Number(v))} tick={{ fontSize: 11 }} width={70} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="loss" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Pérdida" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Precio promedio de insumos</CardTitle>
            <CardDescription>Evolución del costo promedio de ingredientes</CardDescription>
          </CardHeader>
          <CardContent>
            {priceData.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={priceData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => formatCurrency(Number(v))} tick={{ fontSize: 11 }} width={70} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Line type="monotone" dataKey="precio" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Precio promedio" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
      </ErrorBoundary>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
      Sin datos disponibles para este período.
    </div>
  );
}
