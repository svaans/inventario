import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { getCSRFToken } from "../utils/csrf";
import { toast } from "../hooks/use-toast";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    // Obtener primero la cookie de CSRF del backend
    await fetch(`${backendUrl}/login/`, { credentials: "include" });
    const res = await fetch(`${backendUrl}/login/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCSRFToken(),
      },
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      navigate("/dashboard");
    } else {
      toast({
        title: "Error",
        description:
          "Credenciales inválidas. Verifica tu usuario y contraseña e intenta de nuevo",
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