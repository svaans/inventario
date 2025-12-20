import { FormEvent, useMemo, useState } from "react";
import { BarChart, Bar, LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { useFinancialSummary } from "../hooks/useFinancialSummary";
import {
  TransactionInput,
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from "../hooks/useTransactions";
import { formatCurrency } from "../utils/formatCurrency";
import { toast } from "../hooks/use-toast";

const pieColors = ["#2563eb", "#10b981", "#f97316", "#a855f7", "#f43f5e"];

export default function FinancialBalance() {
  const { data: summary } = useFinancialSummary();
  const { data: transactions, isLoading: isTransactionsLoading } = useTransactions();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<TransactionInput>({
    fecha: "",
    descripcion: "",
    tipo: "",
    monto: 0,
    categoria: "",
    referencia: "",
  });

  const kpis = useMemo(() => {
    const kpiSource = summary?.kpis ?? {};
    return [
      {
        label: "Ingresos",
        value: kpiSource.ingresos ?? (summary?.ingresos as number) ?? 0,
        helper: "Total del periodo",
      },
      {
        label: "Egresos",
        value: kpiSource.egresos ?? (summary?.egresos as number) ?? 0,
        helper: "Gastos y costos",
      },
      {
        label: "Balance",
        value: kpiSource.balance ?? (summary?.balance as number) ?? 0,
        helper: "Resultado neto",
      },
      {
        label: "Flujo",
        value: kpiSource.flujo ?? (summary?.flujo as number) ?? 0,
        helper: "Caja disponible",
      },
    ];
  }, [summary]);

  const monthlyBalance = summary?.monthly_balance ?? summary?.balance_mensual ?? [];
  const historicalBalance = summary?.historical_balance ?? summary?.balance_historico ?? [];
  const categoryBreakdown = summary?.category_breakdown ?? summary?.category_charts ?? [];
  const ranking = summary?.ranking ?? summary?.ranking_items ?? [];

  const monthlyChartData = monthlyBalance.map((item) => ({
    label: item.label ?? item.mes ?? item.month ?? item.period ?? "N/A",
    ingresos: Number(item.ingresos ?? 0),
    egresos: Number(item.egresos ?? 0),
    balance: Number(item.balance ?? 0),
  }));

  const historicalChartData = historicalBalance.map((item) => ({
    label: item.label ?? item.mes ?? item.month ?? item.period ?? "N/A",
    balance: Number(item.balance ?? 0),
  }));

  const categoryChartData = categoryBreakdown.map((item) => ({
    label: item.category ?? item.categoria ?? "Sin categoría",
    total: Number(item.total ?? item.monto ?? 0),
  }));

  const rankingData = ranking.map((item) => ({
    label: item.name ?? item.etiqueta ?? "Sin etiqueta",
    total: Number(item.total ?? item.monto ?? 0),
  }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      ...formData,
      monto: Number(formData.monto),
    };

    try {
      if (editingId) {
        await updateTransaction.mutateAsync({ id: editingId, payload });
        toast({ title: "Transacción actualizada" });
      } else {
        await createTransaction.mutateAsync(payload);
        toast({ title: "Transacción registrada" });
      }
      setEditingId(null);
      setFormData({
        fecha: "",
        descripcion: "",
        tipo: "",
        monto: 0,
        categoria: "",
        referencia: "",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo guardar",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (transactionId: number) => {
    const target = transactions.find((transaction) => transaction.id === transactionId);
    if (!target) return;
    setEditingId(target.id);
    setFormData({
      fecha: target.fecha,
      descripcion: target.descripcion,
      tipo: target.tipo,
      monto: target.monto,
      categoria: target.categoria ?? "",
      referencia: target.referencia ?? "",
    });
  };

  const handleDelete = async (transactionId: number) => {
    try {
      await deleteTransaction.mutateAsync(transactionId);
      toast({ title: "Transacción eliminada" });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Balance Financiero</h1>
        <p className="text-muted-foreground">
          Información consolidada de transacciones, balances y métricas clave.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{kpi.label}</CardTitle>
              <CardDescription>{kpi.helper}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(kpi.value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Balance mensual</CardTitle>
            <CardDescription>Ingresos vs egresos por periodo</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {monthlyChartData.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sin datos mensuales disponibles.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyChartData} margin={{ left: -20, right: 0, top: 10, bottom: 0 }}>
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="ingresos" fill="#22c55e" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="egresos" fill="#ef4444" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Balance histórico</CardTitle>
            <CardDescription>Evolución del balance neto</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {historicalChartData.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sin datos históricos disponibles.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicalChartData} margin={{ left: -20, right: 0, top: 10, bottom: 0 }}>
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="balance" stroke="#2563eb" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Distribución por categoría</CardTitle>
            <CardDescription>Participación de gastos/ingresos</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {categoryChartData.length === 0 ? (
              <div className="text-sm text-muted-foreground">No hay categorías registradas.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    dataKey="total"
                    nameKey="label"
                    innerRadius={60}
                    outerRadius={90}
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={entry.label} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Ranking financiero</CardTitle>
            <CardDescription>Top categorías o cuentas según el resumen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {rankingData.length === 0 ? (
                <div className="text-sm text-muted-foreground">No hay ranking disponible.</div>
              ) : (
                rankingData.map((item, index) => (
                  <div
                    key={`${item.label}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {index + 1}
                      </span>
                      <span className="font-medium">{item.label}</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(item.total)}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transacciones</CardTitle>
          <CardDescription>Crear, editar y eliminar movimientos</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(event) => setFormData({ ...formData, fecha: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Input
                id="descripcion"
                value={formData.descripcion}
                onChange={(event) => setFormData({ ...formData, descripcion: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Input
                id="tipo"
                placeholder="Ingreso / Egreso"
                value={formData.tipo}
                onChange={(event) => setFormData({ ...formData, tipo: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monto">Monto</Label>
              <Input
                id="monto"
                type="number"
                step="0.01"
                value={formData.monto}
                onChange={(event) => setFormData({ ...formData, monto: Number(event.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría</Label>
              <Input
                id="categoria"
                value={formData.categoria}
                onChange={(event) => setFormData({ ...formData, categoria: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referencia">Referencia</Label>
              <Input
                id="referencia"
                value={formData.referencia}
                onChange={(event) => setFormData({ ...formData, referencia: event.target.value })}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button type="submit" disabled={createTransaction.isPending || updateTransaction.isPending}>
                {editingId ? "Actualizar" : "Crear"}
              </Button>
              {editingId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      fecha: "",
                      descripcion: "",
                      tipo: "",
                      monto: 0,
                      categoria: "",
                      referencia: "",
                    });
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>

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
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                      {isTransactionsLoading ? "Cargando transacciones..." : "No hay transacciones registradas."}
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.fecha || "-"}</TableCell>
                      <TableCell>{transaction.descripcion || "-"}</TableCell>
                      <TableCell>{transaction.tipo || "-"}</TableCell>
                      <TableCell>{formatCurrency(transaction.monto)}</TableCell>
                      <TableCell>{transaction.categoria || "-"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(transaction.id)}>
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(transaction.id)}
                          disabled={deleteTransaction.isPending}
                        >
                          Eliminar
                        </Button>
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