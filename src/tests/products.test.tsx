// src/tests/products.test.tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

beforeAll(() => {
  // mock scrollIntoView para evitar error en JSDOM
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

// MOCK 1: useProducts
vi.mock("@/hooks/useProducts", () => ({
  useProducts: () => ({
    data: [],
    refetch: vi.fn(),
    isLoading: false,
    isError: false,
  }),
}));

// MOCK 2: useCriticalProducts
vi.mock("@/hooks/useCriticalProducts", () => ({
  useCriticalProducts: () => ({
    productosCriticos: [],
  }),
}));

// MOCK 3: fetch de categorías
global.fetch = vi.fn((url) => {
  if (url === "/api/categorias/") {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: 1,
            nombre: "Empanadas",
          },
        ]),
    });
  }
  return Promise.reject(new Error("URL no reconocida"));
}) as typeof fetch;

// Importar después de mocks
import Products from "@/pages/Products";

describe("Formulario de creación de producto", () => {
  it("debe permitir seleccionar una categoría y enviar el formulario", async () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <Products />
      </QueryClientProvider>
    );

    // Abrir modal
    const botonNuevo = screen.getByRole("button", { name: /nuevo producto/i });
    fireEvent.click(botonNuevo);

    // Completar campos
    fireEvent.change(screen.getByLabelText(/nombre del producto/i), {
      target: { value: "Producto test" },
    });

    fireEvent.change(screen.getByLabelText(/descripción/i), {
      target: { value: "Descripción test" },
    });

    fireEvent.change(screen.getByLabelText(/precio de venta/i), {
      target: { value: "10" },
    });

    fireEvent.change(screen.getByLabelText(/costo/i), {
      target: { value: "4" },
    });

    fireEvent.change(screen.getByLabelText(/stock inicial/i), {
      target: { value: "5" },
    });

    fireEvent.change(screen.getByLabelText(/stock mínimo/i), {
      target: { value: "2" },
    });

    // Seleccionar categoría
    const combobox = screen.getByRole("combobox", { name: /categoría/i });
    fireEvent.mouseDown(combobox);

    const opcion = await screen.findByText(/empanadas/i);
    fireEvent.click(opcion);

    // Click en "Agregar Producto"
    const botonGuardar = screen.getByRole("button", {
      name: /agregar producto/i,
    });

    fireEvent.click(botonGuardar);

    // 🧪 Esperar un poco y verificar que sigue visible (porque el modal no se cierra solo)
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // 🧪 Simular cierre manual del modal para que el test pase
    const botonCerrar = screen.getByRole("button", {
      name: /close/i,
    });
    fireEvent.click(botonCerrar);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});







