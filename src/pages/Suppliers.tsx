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
import { Building2, Phone, Mail, MapPin, Plus, Pencil, Trash2, Search } from "lucide-react";

interface Supplier {
  id: number;
  nombre: string;
  contacto: string;
  telefono: string;
  email: string;
  direccion: string;
}

const emptyForm = { nombre: "", contacto: "", telefono: "", email: "", direccion: "" };

function SupplierAvatar({ name }: { name: string }) {
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

interface SupplierFormProps {
  initial?: Partial<Supplier>;
  onSave: (data: typeof emptyForm) => Promise<void>;
  isPending: boolean;
  onCancel: () => void;
  submitLabel?: string;
}

function SupplierForm({ initial = {}, onSave, isPending, onCancel, submitLabel = "Guardar" }: SupplierFormProps) {
  const [form, setForm] = useState({ ...emptyForm, ...initial });
  const set = (k: keyof typeof emptyForm, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="grid gap-3 py-2">
      <div className="grid gap-1.5">
        <Label htmlFor="s-nombre">Nombre *</Label>
        <Input id="s-nombre" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Proveedor SA" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="s-contacto">Persona de contacto</Label>
        <Input id="s-contacto" value={form.contacto} onChange={(e) => set("contacto", e.target.value)} placeholder="Juan Pérez" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="s-telefono">Teléfono</Label>
          <Input id="s-telefono" value={form.telefono} onChange={(e) => set("telefono", e.target.value)} placeholder="+54 11 0000-0000" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="s-email">Email</Label>
          <Input id="s-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="ventas@proveedor.com" />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="s-direccion">Dirección</Label>
        <Input id="s-direccion" value={form.direccion} onChange={(e) => set("direccion", e.target.value)} placeholder="Av. Ejemplo 123, CABA" />
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

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["suppliers", search],
    queryFn: async () => {
      const url = search ? `/api/proveedores/?search=${encodeURIComponent(search)}` : "/api/proveedores/";
      const res = await apiFetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Error al obtener proveedores");
      const data = await res.json();
      return data.results ?? data;
    },
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (body: typeof emptyForm) => {
      const res = await apiFetch("/api/proveedores/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRFToken() },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Proveedor creado" });
      setCreateOpen(false);
    },
    onError: () => toast({ title: "Error", description: "No se pudo crear el proveedor", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: typeof emptyForm }) => {
      const res = await apiFetch(`/api/proveedores/${id}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRFToken() },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Proveedor actualizado" });
      setEditingSupplier(null);
    },
    onError: () => toast({ title: "Error", description: "No se pudo actualizar el proveedor", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/proveedores/${id}/`, {
        method: "DELETE",
        headers: { "X-CSRFToken": getCSRFToken() },
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: "Proveedor eliminado" });
    },
    onError: () => toast({ title: "Error", description: "No se pudo eliminar el proveedor", variant: "destructive" }),
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
          <p className="text-muted-foreground text-sm mt-1">Gestión de proveedores de insumos</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> Nuevo proveedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px]" aria-describedby="new-supplier-desc">
            <DialogHeader>
              <DialogTitle>Registrar proveedor</DialogTitle>
              <DialogDescription id="new-supplier-desc">Ingresá los datos del nuevo proveedor</DialogDescription>
            </DialogHeader>
            <SupplierForm
              onSave={(data) => createMutation.mutateAsync(data)}
              isPending={createMutation.isPending}
              onCancel={() => setCreateOpen(false)}
              submitLabel="Crear proveedor"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat + search */}
      <div className="flex gap-3 mb-6">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-muted/30 shrink-0">
          <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-xl font-bold">{suppliers.length}</p>
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
      {suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Building2 className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">
            {search ? "Sin resultados" : "Sin proveedores registrados"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {search ? "Probá con otro término de búsqueda." : "Agregá el primer proveedor con el botón de arriba."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {suppliers.map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/40 transition-colors">
              <SupplierAvatar name={s.nombre} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{s.nombre}</p>
                {s.contacto && <p className="text-xs text-muted-foreground">{s.contacto}</p>}
                <div className="flex flex-wrap gap-x-3 mt-0.5">
                  {s.telefono && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3" />{s.telefono}
                    </span>
                  )}
                  {s.email && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3" />{s.email}
                    </span>
                  )}
                  {s.direccion && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />{s.direccion}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30"
                  onClick={() => setEditingSupplier(s)}
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
                  title="Eliminar proveedor"
                  description={`¿Eliminar a "${s.nombre}"? Esta acción no se puede deshacer.`}
                  confirmLabel="Eliminar"
                  onConfirm={() => deleteMutation.mutate(s.id)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={editingSupplier !== null} onOpenChange={(o) => { if (!o) setEditingSupplier(null); }}>
        <DialogContent className="sm:max-w-[440px]" aria-describedby="edit-supplier-desc">
          <DialogHeader>
            <DialogTitle>Editar proveedor</DialogTitle>
            <DialogDescription id="edit-supplier-desc">Modificá los datos del proveedor</DialogDescription>
          </DialogHeader>
          {editingSupplier && (
            <SupplierForm
              initial={editingSupplier}
              onSave={(data) => updateMutation.mutateAsync({ id: editingSupplier.id, body: data })}
              isPending={updateMutation.isPending}
              onCancel={() => setEditingSupplier(null)}
              submitLabel="Actualizar"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
