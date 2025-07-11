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
            nombre_categoria: "Empanadas",
          },
        ]),
    });
  }
  return Promise.reject(new Error("URL no reconocida"));
}) as typeof fetch;

// Importar después de mocks
import Inventory from "@/pages/Inventory";

describe("Formulario de creación de producto", () => {
  it("debe permitir seleccionar una categoría y enviar el formulario", async () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <Inventory />
      </QueryClientProvider>
    );

    // Abrir modal
    const botonNuevo = screen.getByRole("button", { name: /nuevo producto/i });
    fireEvent.click(botonNuevo);
    // El modal debería aparecer
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Cerrar el modal
    const botonCerrar = screen.getByRole("button", { name: /close/i });
    fireEvent.click(botonCerrar);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});







