import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../utils/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "../components/ui/dialog";
import { toast } from "../hooks/use-toast";
import { getCSRFToken } from "../utils/csrf";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { formatCurrency } from "../utils/formatCurrency";
import { Users, Mail, MapPin, Plus, Pencil, Trash2, Search, ShoppingBag, ChevronRight, X } from "lucide-react";

interface Client {
  id: number;
  nombre: string;
  contacto: string;
  email: string;
  direccion: string;
}

interface ClientHistory {
  ventas: { id: number; fecha: string; total: string }[];
  total_gastado: number;
  productos_frecuentes: { producto: string; cantidad: number }[];
  ultima_compra: string | null;
}

const emptyForm = { nombre: "", contacto: "", email: "", direccion: "" };

function ClientAvatar({ name }: { name: string }) {
  const initials = name.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const colors = [
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

interface ClientFormProps {
  initial?: Partial<Client>;
  onSave: (data: typeof emptyForm) => Promise<void>;
  isPending: boolean;
  onCancel: () => void;
  submitLabel?: string;
}

function ClientForm({ initial = {}, onSave, isPending, onCancel, submitLabel = "Guardar" }: ClientFormProps) {
  const [form, setForm] = useState({ ...emptyForm, ...initial });
  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="grid gap-3 py-2">
      <div className="grid gap-1.5">
        <Label htmlFor="c-nombre">Nombre *</Label>
        <Input id="c-nombre" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="María García" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="c-contacto">Teléfono / Contacto</Label>
        <Input id="c-contacto" value={form.contacto} onChange={(e) => set("contacto", e.target.value)} placeholder="+54 11 0000-0000" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="c-email">Email</Label>
        <Input id="c-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="maria@mail.com" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="c-direccion">Dirección</Label>
        <Input id="c-direccion" value={form.direccion} onChange={(e) => set("direccion", e.target.value)} placeholder="Av. Ejemplo 123, CABA" />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave(form)} disabled={isPending || !form.nombre.trim()}>
          {isPending ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

function ClientHistoryPanel({ client, onClose }: { client: Client; onClose: () => void }) {
  const { data, isLoading } = useQuery<ClientHistory>({
    queryKey: ["client-history", client.id],
    queryFn: async () => {
      const res = await apiFetch(`/api/clientes/${client.id}/historial/`, { credentials: "include" });
      if (!res.ok) throw new Error("Error al cargar historial");
      return res.json();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-card rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-xl border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b">
          <div className="flex items-center gap-3">
            <ClientAvatar name={client.nombre} />
            <div>
              <p className="font-semibold">{client.nombre}</p>
              <p className="text-xs text-muted-foreground">{client.contacto || client.email || "Sin contacto"}</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Cargando historial…</div>
        ) : data ? (
          <div className="p-5 space-y-5">
            {/* Summary chips */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total gastado</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(data.total_gastado)}</p>
              </div>
              <div className="rounded-xl bg-blue-50 dark:bg-blue-950/40 p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Compras</p>
                <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{data.ventas.length}</p>
                {data.ultima_compra && (
                  <p className="text-xs text-muted-foreground">Última: {data.ultima_compra}</p>
                )}
              </div>
            </div>

            {/* Frequent products */}
            {data.productos_frecuentes.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Productos frecuentes</p>
                <div className="space-y-1.5">
                  {data.productos_frecuentes.map((p) => (
                    <div key={p.producto} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-muted/50">
                      <span>{p.producto}</span>
                      <span className="text-muted-foreground">{p.cantidad} u.</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent purchases */}
            {data.ventas.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Últimas compras</p>
                <div className="space-y-1.5">
                  {data.ventas.slice(0, 8).map((v) => (
                    <div key={v.id} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg border">
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">{v.fecha}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(Number(v.total))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-sm text-muted-foreground">Sin historial disponible.</div>
        )}
      </div>
    </div>
  );
}

export default function Clients() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["clients", search],
    queryFn: async () => {
      const url = search ? `/api/clientes/?search=${encodeURIComponent(search)}` : "/api/clientes/";
      const res = await apiFetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Error al obtener clientes");
      const data = await res.json();
      return data.results ?? data;
    },
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (body: typeof emptyForm) => {
      const res = await apiFetch("/api/clientes/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRFToken() },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente creado" });
      setCreateOpen(false);
    },
    onError: () => toast({ title: "Error", description: "No se pudo crear el cliente", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: typeof emptyForm }) => {
      const res = await apiFetch(`/api/clientes/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRFToken() },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente actualizado" });
      setEditingClient(null);
    },
    onError: () => toast({ title: "Error", description: "No se pudo actualizar el cliente", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/clientes/${id}/`, {
        method: "DELETE",
        headers: { "X-CSRFToken": getCSRFToken() },
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente eliminado" });
    },
    onError: () => toast({ title: "Error", description: "No se pudo eliminar el cliente", variant: "destructive" }),
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestión de clientes y su historial de compras</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Nuevo cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px]" aria-describedby="new-client-desc">
            <DialogHeader>
              <DialogTitle>Registrar cliente</DialogTitle>
              <DialogDescription id="new-client-desc">Ingresá los datos del nuevo cliente</DialogDescription>
            </DialogHeader>
            <ClientForm
              onSave={(data) => createMutation.mutateAsync(data)}
              isPending={createMutation.isPending}
              onCancel={() => setCreateOpen(false)}
              submitLabel="Crear cliente"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat + search */}
      <div className="flex gap-3 mb-6">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-muted/30 shrink-0">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40">
            <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-xl font-bold">{clients.length}</p>
          </div>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Buscar por nombre o contacto…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">
            {search ? "Sin resultados" : "Sin clientes registrados"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {search ? "Probá con otro término de búsqueda." : "Agregá el primer cliente con el botón de arriba."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((c) => (
            <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/40 transition-colors">
              <ClientAvatar name={c.nombre} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{c.nombre}</p>
                <div className="flex flex-wrap gap-x-3 mt-0.5">
                  {c.contacto && (
                    <span className="text-xs text-muted-foreground">{c.contacto}</span>
                  )}
                  {c.email && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" />{c.email}
                    </span>
                  )}
                  {c.direccion && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />{c.direccion}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => setHistoryClient(c)}
                >
                  Historial <ChevronRight className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30"
                  onClick={() => setEditingClient(c)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-8 h-8 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  }
                  title="Eliminar cliente"
                  description={`¿Eliminar a "${c.nombre}"? Se perderá su información, pero sus compras se conservarán.`}
                  confirmLabel="Eliminar"
                  onConfirm={() => deleteMutation.mutate(c.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editingClient !== null} onOpenChange={(o) => { if (!o) setEditingClient(null); }}>
        <DialogContent className="sm:max-w-[440px]" aria-describedby="edit-client-desc">
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
            <DialogDescription id="edit-client-desc">Modificá los datos del cliente</DialogDescription>
          </DialogHeader>
          {editingClient && (
            <ClientForm
              initial={editingClient}
              onSave={(data) => updateMutation.mutateAsync({ id: editingClient.id, body: data })}
              isPending={updateMutation.isPending}
              onCancel={() => setEditingClient(null)}
              submitLabel="Actualizar"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* History panel */}
      {historyClient && (
        <ClientHistoryPanel client={historyClient} onClose={() => setHistoryClient(null)} />
      )}
    </div>
  );
}
