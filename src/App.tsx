import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { Navigation } from "./components/ui/navigation";
import Home from "./pages/Home";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import SalesWizard from "./pages/SalesWizard";
import Products from "./pages/Products";
import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import BusinessEvolution from "./pages/BusinessEvolution";
import MonthlyTrends from "./pages/MonthlyTrends";
import NotFound from "./pages/NotFound";
import Login from "./pages/login";
import { ProtectedRoute } from "./components/ProtectedRoute";
import FinancialBalance from "./pages/FinancialBalance";
import { ensureCSRFToken } from "./utils/csrf";

// Configuramos React Query con un tiempo de stale más amplio para evitar
// refetch innecesarios pero asegurando sincronización cuando la ventana
// recupera el foco. Esto ayuda a mantener la UI actualizada sin recargar
// constantemente todos los datos.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      refetchOnWindowFocus: true,
    },
  },
});

const App = () => {
  useEffect(() => {
    void ensureCSRFToken();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navigation />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Home />} />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute>
                  <Inventory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/products"
              element={
                <ProtectedRoute>
                  <Products />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales"
              element={
                <ProtectedRoute>
                  <Sales />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sales/new"
              element={
                <ProtectedRoute>
                  <SalesWizard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["finanzas"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/evolucion"
              element={
                <ProtectedRoute allowedRoles={["finanzas"]}>
                  <BusinessEvolution />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tendencias"
              element={
                <ProtectedRoute allowedRoles={["finanzas"]}>
                  <MonthlyTrends />
                </ProtectedRoute>
              }
            />
            <Route
              path="/finanzas"
              element={
                <ProtectedRoute allowedRoles={["finanzas"]}>
                  <FinancialBalance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute>
                  <Employees />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;