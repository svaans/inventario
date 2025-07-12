import { useMemo } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis } from "recharts";
import { useInventoryActivity } from "../hooks/useInventoryActivity";

interface Point {
  time: string;
  value: number;
}

export default function DailyActivityChart() {
  const { data: activity } = useInventoryActivity();
  const data = useMemo<Point[]>(() => {
    if (!activity || activity.length === 0) return [];
    const max = Math.max(...activity.map((p) => p.value), 1);
    return activity.map((p) => ({
      time: p.hour,
      value: (p.value / max) * 100,
    }));
  }, [activity]);

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