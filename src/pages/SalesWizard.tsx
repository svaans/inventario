import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { useClients } from "../hooks/useClients";
import { useProducts } from "../hooks/useProducts";
import { useCreateSale } from "../hooks/useCreateSale";
import { toast } from "../hooks/use-toast";

interface Item { id:number; nombre:string; precio:number; cantidad:number; stock:number; }

export default function SalesWizard() {
  const [step, setStep] = useState(1);
  const [clientSearch, setClientSearch] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);
  const { data: clients = [] } = useClients(clientSearch);

  const [prodSearch, setProdSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const { data: products = [] } = useProducts(prodSearch, barcode);
  const [items, setItems] = useState<Item[]>([]);
  const createSale = useCreateSale();
  const today = new Date().toISOString().slice(0,10);
  const total = items.reduce((s,i)=>s+i.precio*i.cantidad,0);
  const [summary, setSummary] = useState<{count:number; total:number} | null>(null);

  const addProduct = (p: Item) => {
    setItems(prev => [...prev, { ...p, cantidad:1 }]);
    setProdSearch("");
    setBarcode("");
  };

  const updateQty = (id:number, qty:number) => {
    setItems(prev => prev.map(it => it.id===id ? { ...it, cantidad: qty } : it));
  };

  const removeItem = (id:number) => setItems(items.filter(i=>i.id!==id));

  const handleConfirm = async () => {
    try {
      await createSale.mutateAsync({
        fecha: today,
        cliente: clientId ?? undefined,
        detalles: items.map(i => ({ producto: i.id, cantidad: i.cantidad, precio_unitario: i.precio })),
      });
      const res = await fetch('/api/sales-summary/');
      if(res.ok) setSummary(await res.json());
      toast({ title: "Venta registrada" });
      setStep(5);
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {step === 1 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Paso 1: Seleccionar Cliente</h1>
          <Input value={clientSearch} onChange={e=>setClientSearch(e.target.value)} placeholder="Buscar cliente" />
          <div className="border rounded-md max-h-40 overflow-auto">
            {clients.map(c => (
              <div key={c.id} className="p-2 hover:bg-muted cursor-pointer" onClick={()=>{setClientId(c.id); setClientSearch(c.nombre);}}>{c.nombre}</div>
            ))}
          </div>
          <Button onClick={()=>setStep(2)} disabled={!clientSearch}>Siguiente</Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Paso 2: Agregar Productos</h1>
          <Input value={barcode} onChange={e=>setBarcode(e.target.value)} placeholder="Escanear código" className="mb-2" />
          <Input value={prodSearch} onChange={e=>setProdSearch(e.target.value)} placeholder="Buscar producto" />
          <div className="border rounded-md max-h-40 overflow-auto">
            {products.map(p => (
              <div key={p.id} className="p-2 hover:bg-muted cursor-pointer" onClick={()=>addProduct({id:p.id,nombre:p.name,precio:p.price,cantidad:1,stock:p.stock})}>
                {p.name} - ${p.price.toFixed(2)}
              </div>
            ))}
          </div>
          <Button onClick={()=>setStep(3)} disabled={items.length===0}>Siguiente</Button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Paso 3: Confirmar Cantidades</h1>
          <div className="space-y-2">
            {items.map(it => (
              <div key={it.id} className="flex justify-between items-center border-b pb-1">
                <span>{it.nombre}</span>
                <Input type="number" min={1} value={it.cantidad} onChange={e=>updateQty(it.id, parseInt(e.target.value)||1)} className="w-20" />
                {it.cantidad > it.stock && (
                  <span className="text-red-500 text-sm">Sin stock</span>
                )}
                <Button size="sm" variant="ghost" onClick={()=>removeItem(it.id)}>Quitar</Button>
              </div>
            ))}
          </div>
          <div className="text-right font-semibold">Total: ${total.toFixed(2)}</div>
          <Button onClick={()=>setStep(4)} disabled={items.some(i=>i.cantidad>i.stock)}>Siguiente</Button>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <h1 className="text-xl font-bold">Paso 4: Resumen</h1>
          <Card>
            <CardHeader>
              <CardTitle>Venta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>Cliente: {clientSearch}</div>
              {items.map(i=> (
                <div key={i.id} className="flex justify-between">
                  <span>{i.nombre} x{i.cantidad}</span>
                  <span>${(i.cantidad*i.precio).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
          <Button onClick={handleConfirm}>Confirmar Venta</Button>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-4 text-center">
          <h1 className="text-xl font-bold">Venta Registrada</h1>
          {summary && (
            <p>
              Hoy llevas {summary.count} venta{summary.count !== 1 && 's'} por ${summary.total.toFixed(2)}.
            </p>
          )}
          <Button onClick={()=>{setItems([]); setStep(1);}}>Nueva Venta</Button>
        </div>
      )}
    </div>
  );
}