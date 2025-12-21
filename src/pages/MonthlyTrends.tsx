import { useMonthlyTrends } from "../hooks/useMonthlyTrends";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";

export default function MonthlyTrends() {
  const { data } = useMonthlyTrends();

  const stockData = (() => {
    const map: Record<string, { period: string; productos: number; insumos: number }> = {};
    data?.stock?.forEach((s) => {
      if (!map[s.period]) {
        map[s.period] = { period: s.period.slice(0, 7), productos: 0, insumos: 0 };
      }
      if (s.ingrediente) {
        map[s.period].insumos += s.neto;
      } else {
        map[s.period].productos += s.neto;
      }
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
    return Object.entries(grouped).map(([period, cats]) => ({ period, ...cats })).sort((a, b) => a.period.localeCompare(b.period));
  })();

  const lossData = data?.losses?.map((l) => ({ period: l.period.slice(0, 7), loss: l.loss })) || [];

  const priceData = data?.prices?.map((p) => ({ period: p.period.slice(0, 7), precio: p.precio_promedio })) || [];

  const exportCsv = () => {
    const rows: string[] = [];
    rows.push("period,productos,insumos");
    stockData.forEach((d) => rows.push(`${d.period},${d.productos},${d.insumos}`));
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tendencias.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    window.print();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl print:bg-white">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-4xl font-bold text-foreground">Tendencias Mensuales</h1>
        <div className="space-x-2">
          <Button size="sm" onClick={exportCsv}>Exportar CSV</Button>
          <Button size="sm" variant="outline" onClick={exportPdf}>Exportar PDF</Button>
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Stock por tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stockData} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="productos" stroke="hsl(var(--primary))" />
                <Line type="monotone" dataKey="insumos" stroke="hsl(var(--golden))" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Ventas por categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                {salesData.length > 0 &&
                  Object.keys(salesData[0]).filter((k) => k !== "period").map((cat) => (
                    <Line key={cat} type="monotone" dataKey={cat} stroke="hsl(var(--primary))" />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Pérdidas por devoluciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lossData} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="loss" stroke="hsl(var(--destructive))" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Precio promedio insumos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceData} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="precio" stroke="hsl(var(--secondary))" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}