import { useEffect, useState } from "react";

export interface CriticalProduct {
  id: number;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
}

export function useCriticalProducts() {
  const [products, setProducts] = useState<CriticalProduct[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("http://localhost:8000/api/critical-products/");
        if (res.ok) {
          const data = await res.json();
          setProducts(data.results ?? []);
        }
      } catch (error) {
        console.error("Error fetching critical products", error);
      }
    }

    fetchData();
  }, []);

  return products;
}