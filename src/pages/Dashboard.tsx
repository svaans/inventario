import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { BarChart3, Package, Archive, Calendar, User, AlertTriangle } from "lucide-react";
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

  const alerts = data?.alerts?.map((a) => ({
    type: a.stock_actual <= 0 ? "danger" : "warning",
    message: `${a.nombre}: ${a.stock_actual}`,
  })) ?? [];

  const topProducts = data?.top_products ?? [];
  const weekSales = data?.week_sales ?? [];

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
            <CardTitle>Alertas y Notificaciones</CardTitle>
            <CardDescription>Información importante que requiere atención</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {alerts.map((alert, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg border-l-4 border-l-primary bg-muted/30">
                  <User className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Hace {Math.floor(Math.random() * 60)} minutos
                    </p>
                  </div>
                </div>
              ))}
            </div>
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