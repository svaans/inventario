import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

interface Props {
  operational: number;
  nonOperational: number;
}

export default function OperationalPieChart({ operational, nonOperational }: Props) {
  const data = [
    { name: "Operativos", value: operational },
    { name: "No operativos", value: nonOperational },
  ];
  const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))"];
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