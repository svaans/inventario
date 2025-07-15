import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface Props {
  fixed: number;
  variable: number;
}

export default function CostPieChart({ fixed, variable }: Props) {
  const data = [
    { name: "Fijos", value: fixed },
    { name: "Variables", value: variable },
  ];
  const COLORS = ["hsl(var(--primary))", "hsl(var(--golden))"];
  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" outerRadius={80}>
            {data.map((entry, index) => (
              <Cell key={`c-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => v.toFixed(2)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}