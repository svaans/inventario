import { AlertTriangle } from "lucide-react";
import { CriticalProduct } from "../../hooks/useCriticalProducts";

interface CriticalProductsTickerProps {
  products: CriticalProduct[];
}

export default function CriticalProductsTicker({ products }: CriticalProductsTickerProps) {
  if (!products.length) return null;

  return (
    <div className="group overflow-hidden rounded border bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 shadow mb-6">
      <div className="flex items-center whitespace-nowrap animate-marquee group-hover:[animation-play-state:paused] py-2">
        {products.map((product) => (
          <span key={product.id} className="mx-4 flex items-center text-sm">
            <AlertTriangle aria-hidden="true" className="w-4 h-4 mr-1 text-destructive" />
            {product.nombre}: {product.stock_actual}
          </span>
        ))}
      </div>
    </div>
  );
}