import { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis } from "recharts";

interface Point {
  time: string;
  value: number;
}

export default function DailyActivityChart() {
  const data = useMemo<Point[]>(() => {
    const points: Point[] = [];
    for (let h = 8; h <= 20; h++) {
      points.push({
        time: `${String(h).padStart(2, "0")}:00`,
        value: Math.random() * 100,
      });
    }
    return points;
  }, []);

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
          <XAxis dataKey="time" axisLine={false} tickLine={false} />
          <YAxis hide domain={[0, "dataMax"]} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--golden))"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}