import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../utils/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { toast } from "../hooks/use-toast";
import useFormFields from "../hooks/useFormFields";
import { getCSRFToken } from "../utils/csrf";
import { UserPlus, Users, Mail } from "lucide-react";

interface Employee {
  id: number;
  username: string;
  first_name: string;
  email: string;
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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
      {initials || "?"}
    </div>
  );
}

export default function Employees() {
  const queryClient = useQueryClient();
  const { data: employees = [], refetch } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await apiFetch("/api/empleados/", { credentials: "include" });
      if (!res.ok) throw new Error("Error al obtener empleados");
      const data = await res.json();
      return data.results ?? data;
    },
  });

  const createEmployee = useMutation<unknown, Error, { username: string; password: string; first_name: string; email: string }>({
    mutationFn: async (emp) => {
      const res = await apiFetch("/api/empleados/", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-CSRFToken": getCSRFToken() },
        credentials: "include",
        body: JSON.stringify(emp),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  const [open, setOpen] = useState(false);
  const { values: form, handleChange, setValues: setForm } = useFormFields({
    username: "", password: "", first_name: "", email: "",
  });

  const handleSubmit = async () => {
    try {
      await createEmployee.mutateAsync(form);
      toast({ title: "Empleado creado" });
      setForm({ username: "", password: "", first_name: "", email: "" });
      setOpen(false);
      refetch();
    } catch {
      toast({ title: "Error", description: "No se pudo crear el empleado", variant: "destructive" });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Empleados</h1>
          <p className="text-muted-foreground text-sm mt-1">Usuarios con acceso al sistema</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-4 h-4" /> Nuevo empleado
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[400px]" aria-describedby="new-employee-description">
            <DialogHeader>
              <DialogTitle>Registrar empleado</DialogTitle>
              <DialogDescription id="new-employee-description">
                Ingresa los datos del nuevo usuario
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="first_name">Nombre completo</Label>
                <Input id="first_name" value={form.first_name} onChange={(e) => handleChange("first_name", e.target.value)} placeholder="Juan Pérez" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="username">Usuario</Label>
                <Input id="username" value={form.username} onChange={(e) => handleChange("username", e.target.value)} placeholder="juanperez" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} placeholder="juan@empresa.com" />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" value={form.password} onChange={(e) => handleChange("password", e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={createEmployee.isPending || !form.username || !form.password}>
                  {createEmployee.isPending ? "Guardando…" : "Guardar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-muted/30 mb-6">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40">
          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Total empleados</p>
          <p className="text-xl font-bold">{employees.length}</p>
        </div>
      </div>

      {/* List */}
      {employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Users className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold mb-1">Sin empleados registrados</h3>
          <p className="text-sm text-muted-foreground">Agregá el primer empleado con el botón de arriba.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map((emp) => (
            <div key={emp.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted/40 transition-colors">
              <Avatar name={emp.first_name || emp.username} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{emp.first_name || emp.username}</p>
                <p className="text-xs text-muted-foreground">@{emp.username}</p>
              </div>
              {emp.email && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{emp.email}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
