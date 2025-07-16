import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../utils/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { toast } from "../hooks/use-toast";
import { getCSRFToken } from "../utils/csrf";

interface Employee {
  id: number;
  username: string;
  first_name: string;
  email: string;
}

export default function Employees() {
  const queryClient = useQueryClient();
  const { data: employees = [], refetch } = useQuery<Employee[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      const res = await apiFetch("/api/empleados/", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Error al obtener empleados");
      }
      const data = await res.json();
      return data.results ?? data;
    },
  });

  const createEmployee = useMutation<unknown, Error, { username: string; password: string; first_name: string; email: string }>({
    mutationFn: async (emp: { username: string; password: string; first_name: string; email: string }) => {
      const res = await apiFetch("/api/empleados/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
        credentials: "include",
        body: JSON.stringify(emp),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", first_name: "", email: "" });

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
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Empleados</h1>
          <p className="text-muted-foreground">Gestiona los usuarios del sistema</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
            <Button>Nuevo Empleado</Button>
          </DialogTrigger>
          <DialogContent
            className="sm:max-w-[425px]"
            aria-describedby="new-employee-description"
          >
            <DialogHeader>
              <DialogTitle>Registrar Empleado</DialogTitle>
              <DialogDescription id="new-employee-description">
                Ingresa los datos del nuevo usuario
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Usuario</Label>
                <Input id="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="first_name">Nombre</Label>
                <Input id="first_name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <Button onClick={handleSubmit} disabled={createEmployee.isPending}>Guardar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-4">
        {employees.map((emp) => (
          <Card key={emp.id} className="hover:shadow-warm transition-shadow">
            <CardHeader>
              <CardTitle>
                {emp.first_name} ({emp.username})
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{emp.email}</CardContent>
          </Card>
        ))}
      </div>
      {employees.length === 0 && (
        <p className="text-center text-muted-foreground">No hay empleados registrados.</p>
      )}
    </div>
  );
}