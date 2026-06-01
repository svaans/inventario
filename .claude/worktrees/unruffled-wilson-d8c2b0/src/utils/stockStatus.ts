export function getStockStatus(stock: number, minStock: number) {
  if (stock <= minStock) return { label: "Stock Bajo", variant: "destructive" as const };
  if (stock <= minStock * 1.5) return { label: "Stock Medio", variant: "outline" as const };
  return { label: "Stock Normal", variant: "secondary" as const };
}