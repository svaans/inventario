import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { getCSRFToken } from "../utils/csrf";
import { toast } from "../hooks/use-toast";
import { apiFetch } from "../utils/api";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      // Obtener primero la cookie de CSRF del backend
      await apiFetch("/login/");
      const res = await apiFetch("/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken(),
        },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["current-user"] });
        navigate("/dashboard");
        return;
      }
      toast({
        title: "Error",
        description:
          "Credenciales inválidas. Verifica tu usuario y contraseña e intenta de nuevo",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Error de conexión",
        description:
          "No se pudo conectar con el servidor. Revisa la URL del backend y tu conexión.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-panel-gradient">
      <form onSubmit={handleSubmit} className="bg-card p-6 rounded shadow w-80 space-y-4">
        <h1 className="text-2xl font-bold text-center">Iniciar Sesión</h1>
        <input
          required
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border border-border rounded px-3 py-2 w-full"
        />
        <input
          required
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-border rounded px-3 py-2 w-full"
        />
        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>
    </div>
  );
}