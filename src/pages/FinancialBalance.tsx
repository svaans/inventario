import { FormEvent, useMemo, useState } from "react";
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, CartesianGrid, Legend } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { useFinancialSummary } from "../hooks/useFinancialSummary";
import { TransactionInput, useCreateTransaction, useDeleteTransaction, useTransactions, useUpdateTransaction } from "../hooks/useTransactions";
import { formatCurrency } from "../utils/formatCurrency";
import { toast } from "../hooks/use-toast";
import { TrendingUp, TrendingDown, Wallet, ArrowRightLeft, Plus, Pencil, Trash2 } from "lucide-react";

const PIE_COLORS = ["#3b82f6", "#10b981", "#f97316", "#a855f7", "#f43f5e", "#06b6d4"];

const EMPTY_FORM: TransactionInput = { fecha: "", descripcion: "", tipo: "", monto: 0, categoria: "", referencia: "" };

export default function FinancialBalance() {
  const { data: summary } = useFinancialSummary();
  const { data: transactions = [], isLoading: isTransactionsLoading } = useTransactions();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<TransactionInput>(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);

  const kpis = useMemo(() => {
    const s = summary?.kpis ?? summary ?? {};
    return [
      { label: "Ingresos", value: (s as Record<string, number>).ingresos ?? 0, helper: "Total del periodo", icon: TrendingUp, color: "emerald" as const },
      { label: "Egresos", value: (s as Record<string, number>).egresos ?? 0, helper: "Gastos y costos", icon: TrendingDown, color: "red" as const },
      { label: "Balance", value: (s as Record<string, number>).balance ?? 0, helper: "Resultado neto", icon: Wallet, color: "blue" as const },
      { label: "Flujo de caja", value: (s as Record<string, number>).flujo ?? 0, helper: "Caja disponible", icon: ArrowRightLeft, color: "amber" as const },
    ];
  }, [summary]);

  const colorMap = {
    emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/40", iconBg: "bg-emerald-100 dark:bg-emerald-900/60", text: "text-emerald-700 dark:text-emerald-300", icon: "text-emerald-600 dark:text-emerald-400" },
    red: { bg: "bg-red-50 dark:bg-red-950/40", iconBg: "bg-red-100 dark:bg-red-900/60", text: "text-red-700 dark:text-red-300", icon: "text-red-600 dark:text-red-400" },
    blue: { bg: "bg-blue-50 dark:bg-blue-950/40", iconBg: "bg-blue-100 dark:bg-blue-900/60", text: "text-blue-700 dark:text-blue-300", icon: "text-blue-600 dark:text-blue-400" },
    amber: { bg: "bg-amber-50 dark:bg-amber-950/40", iconBg: "bg-amber-100 dark:bg-amber-900/60", text: "text-amber-700 dark:text-amber-300", icon: "text-amber-600 dark:text-amber-400" },
  };

  const monthlyChartData = (summary?.monthly_balance ?? summary?.balance_mensual ?? []).map((item) => ({
    label: item.label ?? item.mes ?? item.month ?? item.period ?? "N/A",
    ingresos: Number(item.ingresos ?? 0),
    egresos: Number(item.egresos ?? 0),
  }));

  const historicalChartData = (summary?.historical_balance ?? summary?.balance_historico ?? []).map((item) => ({
    label: item.label ?? item.mes ?? item.month ?? item.period ?? "N/A",
    balance: Number(item.balance ?? 0),
  }));

  const categoryChartData = (summary?.category_breakdown ?? summary?.category_charts ?? []).map((item) => ({
    label: item.category ?? item.categoria ?? "Sin categoría",
    total: Number(item.total ?? item.monto ?? 0),
  }));

  const rankingData = (summary?.ranking ?? summary?.ranking_items ?? []).map((item) => ({
    label: item.name ?? item.etiqueta ?? "Sin etiqueta",
    total: Number(item.total ?? item.monto ?? 0),
  }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = { ...formData, monto: Number(formData.monto) };
    try {
      if (editingId) {
        await updateTransaction.mutateAsync({ id: editingId, payload });
        toast({ title: "Transacción actualizada" });
      } else {
        await createTransaction.mutateAsync(payload);
        toast({ title: "Transacción registrada" });
      }
      setEditingId(null);
      setFormData(EMPTY_FORM);
      setShowForm(false);
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudo guardar", variant: "destructive" });
    }
  };

  const handleEdit = (id: number) => {
    const target = transactions.find((t) => t.id === id);
    if (!target) return;
    setEditingId(target.id);
    setFormData({ fecha: target.fecha, descripcion: target.descripcion, tipo: target.tipo, monto: target.monto, categoria: target.categoria ?? "", referencia: target.referencia ?? "" });
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData(EMPTY_FORM);
    setShowForm(false);
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTransaction.mutateAsync(id);
      toast({ title: "Transacción eliminada" });
    } catch (error) {
      toast({ title: "Error", description: error instanceof Error ? error.message : "No se pudo eliminar", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Balance Financiero</h1>
        <p className="text-muted-foreground text-sm mt-1">Información consolidada de transacciones, balances y métricas clave</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const c = colorMap[kpi.color];
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className={`border-0 shadow-sm ${c.bg}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                  <div className={`p-1.5 rounded-lg ${c.iconBg}`}>
                    <Icon className={`w-3.5 h-3.5 ${c.icon}`} />
                  </div>
                </div>
                <p className={`text-xl font-bold ${c.text}`}>{formatCurrency(kpi.value)}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.helper}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Balance mensual</CardTitle>
            <CardDescription>Ingresos vs egresos por periodo</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyChartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyChartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => formatCurrency(Number(v))} tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend formatter={(v) => v === "ingresos" ? "Ingresos" : "Egresos"} />
                    <Bar dataKey="ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="egresos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Balance histórico</CardTitle>
            <CardDescription>Evolución del balance neto acumulado</CardDescription>
          </CardHeader>
          <CardContent>
            {historicalChartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalChartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => formatCurrency(Number(v))} tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} dot={false} name="Balance" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribución por categoría</CardTitle>
            <CardDescription>Participación de gastos e ingresos</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryChartData.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryChartData} dataKey="total" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={3}>
                      {categoryChartData.map((entry, index) => (
                        <Cell key={entry.label} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ranking financiero</CardTitle>
            <CardDescription>Top categorías o cuentas según el resumen</CardDescription>
          </CardHeader>
          <CardContent>
            {rankingData.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                No hay ranking disponible.
              </div>
            ) : (
              <div className="space-y-2">
                {rankingData.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                        {index + 1}
                      </span>
                      <span className="font-medium text-sm">{item.label}</span>
                    </div>
                    <span className="font-semibold text-sm">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transactions section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Transacciones</CardTitle>
              <CardDescription>Movimientos registrados en el sistema</CardDescription>
            </div>
            {!showForm && (
              <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Nueva
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {showForm && (
            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <p className="text-sm font-semibold mb-4">{editingId ? "Editar transacción" : "Nueva transacción"}</p>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fecha">Fecha</Label>
                  <Input id="fecha" type="date" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Input id="descripcion" value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Input id="tipo" placeholder="Ingreso / Egreso" value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="monto">Monto</Label>
                  <Input id="monto" type="number" step="0.01" value={formData.monto} onChange={(e) => setFormData({ ...formData, monto: Number(e.target.value) })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="categoria">Categoría</Label>
                  <Input id="categoria" value={formData.categoria} onChange={(e) => setFormData({ ...formData, categoria: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="referencia">Referencia</Label>
                  <Input id="referencia" value={formData.referencia} onChange={(e) => setFormData({ ...formData, referencia: e.target.value })} />
                </div>
                <div className="flex items-end gap-2 md:col-span-2 lg:col-span-3">
                  <Button type="submit" disabled={createTransaction.isPending || updateTransaction.isPending}>
                    {editingId ? "Actualizar" : "Guardar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>Cancelar</Button>
                </div>
              </form>
            </div>
          )}

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isTransactionsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      Cargando transacciones…
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-1">
                        <ArrowRightLeft className="w-6 h-6 text-muted-foreground mb-1" />
                        <span className="text-sm text-muted-foreground">No hay transacciones registradas.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{t.fecha || "-"}</TableCell>
                      <TableCell className="text-sm">{t.descripcion || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={t.tipo?.toLowerCase().includes("ingreso") ? "border-emerald-300 text-emerald-700 bg-emerald-50" : "border-red-300 text-red-700 bg-red-50"}>
                          {t.tipo || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{formatCurrency(t.monto)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.categoria || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(t.id)} className="h-7 w-7 p-0">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(t.id)} disabled={deleteTransaction.isPending} className="h-7 w-7 p-0 text-destructive hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
      Sin datos disponibles.
    </div>
  );
}
