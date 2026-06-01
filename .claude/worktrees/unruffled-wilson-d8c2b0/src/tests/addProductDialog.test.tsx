import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeAll } from "vitest";
import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

vi.mock("@/hooks/useProducts", () => ({
  useProducts: () => ({ data: [], refetch: vi.fn(), isLoading: false, isError: false })
}));

vi.mock("@/utils/api", () => ({
  fetchCategories: () => Promise.resolve([
    { id: 1, nombre_categoria: "Ingredientes" },
    { id: 2, nombre_categoria: "Bebidas" },
    { id: 3, nombre_categoria: "Insumos" }
  ]),
  fetchUnits: () => Promise.resolve([
    { id: 1, nombre: "Unidad", abreviatura: "u" },
    { id: 2, nombre: "Kilogramo", abreviatura: "kg" },
  ]),
  apiFetch: vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ id: 123 }) }))
}));


import AddProductDialog from "@/components/inventory/AddProductDialog";

describe("AddProductDialog", () => {
  it("renders without errors when selecting non ingredient category", async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AddProductDialog />
      </QueryClientProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: /nuevo producto/i }));
    await waitFor(() => screen.getByRole("dialog"));
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: /bebidas/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
  });

  it("handles ingredient category synonyms", async () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AddProductDialog />
      </QueryClientProvider>
    );
    fireEvent.click(screen.getByRole("button", { name: /nuevo producto/i }));
    await waitFor(() => screen.getByRole("dialog"));
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: /insumos/i }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
  });
});