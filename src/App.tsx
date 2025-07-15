import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/products" element={<Products />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/sales/new" element={<SalesWizard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/evolucion" element={<BusinessEvolution />} />
          <Route path="/tendencias" element={<MonthlyTrends />} />
          <Route path="/employees" element={<Employees />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;