import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Archive, BarChart3, Clock } from "lucide-react";
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
      color: "text-primary"
    },
    {
      title: "Stock Bajo",
      value: lowStock.toString(),
      icon: Archive,
      color: "text-destructive"
    },
    {
      title: "Valor Total",
      value: formatCurrency(totalValue),
      icon: BarChart3,
      color: "text-golden"
    },
    {
      title: "Última Actualización",
      value: lastUpdated,
      icon: Clock,
      color: "text-muted-foreground"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => (
        <Card key={stat.title} className="hover:shadow-warm transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon aria-hidden="true" className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}