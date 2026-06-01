import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { formatCurrency } from "@/utils/formatCurrency";

interface InventoryStatsProps {
  totalProducts: number;
  lowStock: number;
  totalValue: number;
  lastUpdated: string;
}

export function InventoryStats({ totalProducts, lowStock, totalValue, lastUpdated }: InventoryStatsProps) {
  const stats = [
    {
      title: "Total Productos",
      value: totalProducts.toString(),
      icon: Package,
      bg: "bg-blue-50 dark:bg-blue-950/40",
      iconBg: "bg-blue-100 dark:bg-blue-900/60",
      iconColor: "text-blue-600 dark:text-blue-400",
      valueColor: "text-blue-700 dark:text-blue-300",
    },
    {
      title: "Stock Bajo",
      value: lowStock.toString(),
      icon: AlertTriangle,
      bg: lowStock > 0 ? "bg-red-50 dark:bg-red-950/40" : "bg-green-50 dark:bg-green-950/40",
      iconBg: lowStock > 0 ? "bg-red-100 dark:bg-red-900/60" : "bg-green-100 dark:bg-green-900/60",
      iconColor: lowStock > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400",
      valueColor: lowStock > 0 ? "text-red-700 dark:text-red-300" : "text-green-700 dark:text-green-300",
    },
    {
      title: "Valor Total",
      value: formatCurrency(totalValue),
      icon: TrendingUp,
      bg: "bg-amber-50 dark:bg-amber-950/40",
      iconBg: "bg-amber-100 dark:bg-amber-900/60",
      iconColor: "text-amber-600 dark:text-amber-400",
      valueColor: "text-amber-700 dark:text-amber-300",
    },
    {
      title: "Última Actualización",
      value: lastUpdated,
      icon: Clock,
      bg: "bg-slate-50 dark:bg-slate-800/40",
      iconBg: "bg-slate-100 dark:bg-slate-700/60",
      iconColor: "text-slate-500 dark:text-slate-400",
      valueColor: "text-slate-600 dark:text-slate-300",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className={`border-0 shadow-sm ${stat.bg} transition-transform hover:-translate-y-0.5 duration-200`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.title}
                </p>
                <div className={`p-2 rounded-lg ${stat.iconBg}`}>
                  <Icon className={`h-4 w-4 ${stat.iconColor}`} aria-hidden="true" />
                </div>
              </div>
              <p className={`text-2xl font-bold ${stat.valueColor}`}>{stat.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
