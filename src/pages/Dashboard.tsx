import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { BarChart3, Package, Archive, Calendar, User } from "lucide-react";

export default function Dashboard() {
  // Mock data - En producción esto vendría de una API
  const dashboardData = {
    sales: {
      today: 1250,
      thisWeek: 8450,
      thisMonth: 32100,
      growth: 12.5
    },
    inventory: {
      totalProducts: 24,
      lowStock: 3,
      outOfStock: 1,
      totalValue: 15650
    },
    production: {
      dailyGoal: 500,
      produced: 387,
      efficiency: 77.4
    },
    topProducts: [
      { name: "Empanadas de Carne", sold: 156, stock: 150 },
      { name: "Empanadas de Pollo", sold: 134, stock: 120 },
      { name: "Empanadas de Queso", sold: 98, stock: 25 },
      { name: "Empanadas de Jamón y Queso", sold: 87, stock: 95 }
    ]
  };

  const alerts = [
    { type: "warning", message: "Stock bajo: Empanadas de Queso (25 unidades)" },
    { type: "danger", message: "Sin stock: Harina de Maíz" },
    { type: "info", message: "Nuevo pedido programado para mañana" }
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
            <div className="text-2xl font-bold">${dashboardData.sales.today}</div>
            <p className="text-xs opacity-80">
              +{dashboardData.sales.growth}% vs ayer
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.inventory.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.inventory.lowStock} con stock bajo
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
              {dashboardData.production.produced}/{dashboardData.production.dailyGoal}
            </div>
            <Progress value={dashboardData.production.efficiency} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Inventario</CardTitle>
            <Calendar className="h-4 w-4 text-brown" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${dashboardData.inventory.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Valor total del stock
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Productos Más Vendidos</CardTitle>
            <CardDescription>Ranking de productos por ventas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.topProducts.map((product, index) => (
                <div key={product.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">{product.sold} vendidas</p>
                    </div>
                  </div>
                  <Badge variant={product.stock > 50 ? "secondary" : product.stock > 20 ? "outline" : "destructive"}>
                    Stock: {product.stock}
                  </Badge>
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
      </div>

      {/* Weekly Overview */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Resumen Semanal</CardTitle>
          <CardDescription>Ventas de los últimos 7 días</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-4">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((day, index) => {
              const amount = Math.floor(Math.random() * 500) + 800;
              const height = (amount / 1300) * 100;
              
              return (
                <div key={day} className="text-center">
                  <div className="bg-muted rounded-lg p-2 mb-2 h-24 flex items-end justify-center">
                    <div 
                      className="bg-primary rounded w-6 transition-all duration-300 hover:bg-primary/80"
                      style={{ height: `${height}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground">{day}</p>
                  <p className="text-sm font-medium">${amount}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}