import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { BarChart3, Package, Archive, Calendar, AlertTriangle, ShoppingBag } from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
import CostPieChart from "../components/finance/CostPieChart";
import OperationalPieChart from "../components/finance/OperationalPieChart";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { formatCurrency } from "../utils/formatCurrency";
import { useEffect } from "react";
import { toast } from "../hooks/use-toast";

export default function Dashboard() {
  // Mock data - En producción esto vendría de una API
  const { data, isError } = useDashboard();
  const dailyGoal = 500;

  useEffect(() => {
    if (isError) {
      toast({
        title: "Error",
        description: "No se pudo cargar el dashboard",
        variant: "destructive",
      });
    }
  }, [isError]);

  const reorderSuggestions = data?.reorder_suggestions ?? [];
  const pendingPurchases = data?.pending_purchases ?? reorderSuggestions.length;
  const lowStockAlerts = data?.alerts ?? [];
  const topProducts = data?.top_products ?? [];
  const weekSales = data?.week_sales ?? [];
  const notifications = [
    ...reorderSuggestions.map((suggestion) => ({
      key: `reorder-${suggestion.producto}`,
      tone: "reorder" as const,
      title: `Reorden sugerido: ${suggestion.nombre}`,
      description: `Compra recomendada de ${suggestion.cantidad} unidades`,
      extra: suggestion.proveedor_nombre
        ? `Proveedor sugerido: ${suggestion.proveedor_nombre}`
        : "Asigna un proveedor para agilizar la orden.",
    })),
    ...lowStockAlerts.map((alert) => ({
      key: `stock-${alert.nombre}-${alert.stock_actual}`,
      tone: alert.stock_actual <= 0 ? ("critical" as const) : ("warning" as const),
      title: `Stock bajo: ${alert.nombre}`,
      description: `Stock actual ${alert.stock_actual} (mínimo ${alert.stock_minimo})`,
      extra: alert.stock_actual <= 0 ? "Sin existencias disponibles." : undefined,
    })),
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Resumen general de tu negocio</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas Hoy</CardTitle>
            <BarChart3 className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.sales_today ?? 0)}</div>
            <p className="text-xs opacity-80">
              +{((data?.sales_week ?? 0) / (dailyGoal || 1)).toFixed(1)}% vs ayer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.total_products ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {data?.low_stock ?? 0} con stock bajo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Producción Diaria</CardTitle>
            <Archive className="h-4 w-4 text-golden" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.production_today ?? 0}/{dailyGoal}
            </div>
            <Progress value={((data?.production_today ?? 0) / dailyGoal) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
            <Calendar className="h-4 w-4 text-brown" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.inventory_value ?? 0)}</div>
            <p className="text-xs text-muted-foreground">
              Valor total del stock
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
            <CardDescription>Ranking de productos por ventas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.producto__nombre} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.producto__nombre}</p>
                      <p className="text-sm text-muted-foreground">{product.total_vendido} vendidas</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <CardTitle>Alertas y Notificaciones</CardTitle>
              {pendingPurchases > 0 && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  {pendingPurchases} compras pendientes
                </Badge>
              )}
            </div>
            <CardDescription>
              Información importante que requiere atención, incluyendo sugerencias automáticas de reorden.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay alertas en este momento.</p>
            ) : (
              <div className="space-y-4">
                {notifications.map((alert) => {
                  const toneStyles = {
                    reorder: "border-emerald-500 bg-emerald-500/10 text-emerald-700",
                    critical: "border-destructive bg-destructive/10 text-destructive",
                    warning: "border-amber-500 bg-amber-500/10 text-amber-700",
                  };
                  const icon =
                    alert.tone === "reorder" ? (
                      <ShoppingBag className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    );

                  return (
                    <div
                      key={alert.key}
                      className={`flex items-start space-x-3 p-3 rounded-lg border-l-4 ${toneStyles[alert.tone]}`}
                    >
                      <div className="mt-0.5">{icon}</div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">{alert.title}</p>
                        <p className="text-xs text-muted-foreground">{alert.description}</p>
                        {alert.extra && <p className="text-xs text-primary font-medium">{alert.extra}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Costos Mensuales</CardTitle>
            <CardDescription>Fijos vs variables</CardDescription>
          </CardHeader>
          <CardContent>
            <CostPieChart fixed={data?.fixed_costs ?? 0} variable={data?.variable_costs ?? 0} />
            <p className="text-center text-sm mt-4">
              Punto de equilibrio:
              {data?.break_even ? ` ${formatCurrency(data.break_even)}` : " N/A"}
            </p>
          </CardContent>
        </Card>

        {/* Operational Costs */}
        <Card>
          <CardHeader>
            <CardTitle>Gastos Operativos</CardTitle>
            <CardDescription>Operativos vs no operativos</CardDescription>
          </CardHeader>
          <CardContent>
            <OperationalPieChart operational={data?.operational_costs ?? 0} nonOperational={data?.non_operational_costs ?? 0} />
            {data && data.non_operational_percent > 15 && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atención</AlertTitle>
                <AlertDescription>
                  Los costos no operativos superan el 15% de los egresos.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weekly Overview */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Resumen Semanal</CardTitle>
          <CardDescription>Ventas de los últimos 7 días</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-4">
            {weekSales.map((item) => {
              const height = (item.total / Math.max(...weekSales.map((w) => w.total), 1)) * 100;
              
              return (
                <div key={item.day} className="text-center">
                  <div className="bg-muted rounded-lg p-2 mb-2 h-24 flex items-end justify-center">
                    <div 
                      className="bg-primary rounded w-6 transition-all duration-300 hover:bg-primary/80"
                      style={{ height: `${height}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.day}</p>
                  <p className="text-sm font-medium">{formatCurrency(item.total)}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}