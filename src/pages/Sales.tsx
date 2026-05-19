import { useSales } from "../hooks/useSales";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { toast } from "../hooks/use-toast";
import { Skeleton } from "../components/ui/skeleton";
import { formatCurrency } from "../utils/formatCurrency";
import { Plus, Search, ShoppingCart, TrendingUp, Users, Calendar } from "lucide-react";

export default function Sales() {
  const { data: sales = [], isLoading, isError } = useSales();
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isError) {
      toast({ title: "Error", description: "No se pudieron cargar las ventas", variant: "destructive" });
    }
  }, [isError]);

  const filtered = sales.filter(
    (s) =>
      String(s.id).includes(search) ||
      (s.cliente ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (s.usuario ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const totalHoy = sales
    .filter((s) => s.fecha === new Date().toISOString().slice(0, 10))
    .reduce((sum, s) => sum + s.total, 0);

  const totalGeneral = sales.reduce((sum, s) => sum + s.total, 0);
  const clientes = new Set(sales.map((s) => s.cliente).filter(Boolean)).size;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ventas</h1>
          <p className="text-muted-foreground text-sm mt-1">Registro y seguimiento de ventas</p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/sales/new">
            <Plus className="w-4 h-4" />
            Registrar venta
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-950/40">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ventas totales</p>
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/60">
                <ShoppingCart className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{sales.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-emerald-50 dark:bg-emerald-950/40">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ingresos hoy</p>
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/60">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(totalHoy)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-amber-50 dark:bg-amber-950/40 col-span-2 lg:col-span-1">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total acumulado</p>
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60">
                <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{formatCurrency(totalGeneral)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
        <Input
          placeholder="Buscar por ID, cliente o usuario…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Sales list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <ShoppingCart className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">
            {search ? "Sin resultados" : "No hay ventas registradas"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {search ? `No se encontró ninguna venta para "${search}"` : "Registrá tu primera venta para verla aquí."}
          </p>
          {search && (
            <Button variant="ghost" size="sm" className="mt-3" onClick={() => setSearch("")}>
              Limpiar búsqueda
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((sale) => {
            const isToday = sale.fecha === new Date().toISOString().slice(0, 10);
            return (
              <Link
                key={sale.id}
                to={`/sales/${sale.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/40 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <ShoppingCart className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Venta #{sale.id}</span>
                      {isToday && (
                        <Badge className="text-xs bg-emerald-100 text-emerald-700 border-0 dark:bg-emerald-900/40 dark:text-emerald-400">
                          Hoy
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {sale.fecha}
                      </span>
                      {sale.cliente && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {sale.cliente}
                        </span>
                      )}
                      {sale.usuario && <span>por {sale.usuario}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-sm">{formatCurrency(sale.total)}</span>
                  <svg className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && search && (
        <p className="text-xs text-muted-foreground mt-3">{filtered.length} resultado{filtered.length !== 1 ? "s" : ""}</p>
      )}
    </div>
  );
}
