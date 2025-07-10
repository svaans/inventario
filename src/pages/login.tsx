import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
    const res = await fetch(`${backendUrl}/login/`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    if (res.ok) {
      navigate("/dashboard");
    } else {
      alert("Credenciales inválidas");
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