import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import useFormFields from "@/hooks/useFormFields";

describe("useFormFields", () => {
  it("updates values and validates", () => {
    const { result } = renderHook(() =>
      useFormFields({ name: "" }, { name: v => (v ? null : "requerido") })
    );

    act(() => {
      result.current.handleChange("name", "");
    });
    expect(result.current.errors.name).toBe("requerido");

    act(() => {
      result.current.handleChange("name", "abc");
    });
    expect(result.current.values.name).toBe("abc");
    expect(result.current.errors.name).toBeNull();
  });
});