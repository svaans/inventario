import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

const ProtectedRoute = ({ children }: any) => {
  const isAuthenticated = Boolean(localStorage.getItem("token"));
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

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

const App = () => (
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
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evolucion"
            element={
              <ProtectedRoute>
                <BusinessEvolution />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tendencias"
            element={
              <ProtectedRoute>
                <MonthlyTrends />
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

export default App;