import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BooleanTermInput } from "@/components/search/BooleanTermInput";
import { DateRangePicker } from "@/components/search/DateRangePicker";
import { SemanticPaginator } from "@/components/search/SemanticPaginator";

describe("BooleanTermInput", () => {
  it("renderiza términos existentes como chips", () => {
    const terms = [
      { value: "beca", mode: "include" as const },
      { value: "universidad", mode: "exclude" as const },
    ];
    render(<BooleanTermInput terms={terms} onChange={() => {}} />);
    expect(screen.getByText("beca")).toBeInTheDocument();
    expect(screen.getByText(/universidad/)).toBeInTheDocument();
  });

  it("añade un término al hacer clic en Añadir", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BooleanTermInput terms={[]} onChange={onChange} />);

    const input = screen.getByPlaceholderText("Añadir término...");
    await user.type(input, "convocatoria");
    await user.click(screen.getByText("Añadir"));

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ value: "convocatoria", mode: "include" }),
    ]);
  });

  it("añade un término al pulsar Enter", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BooleanTermInput terms={[]} onChange={onChange} />);

    const input = screen.getByPlaceholderText("Añadir término...");
    await user.type(input, "beca{Enter}");

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ value: "beca", mode: "include" }),
    ]);
  });

  it("elimina un término al hacer clic en ×", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const terms = [{ value: "beca", mode: "include" as const }];
    render(<BooleanTermInput terms={terms} onChange={onChange} />);

    await user.click(screen.getByLabelText("Eliminar beca"));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("no añade términos vacíos", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BooleanTermInput terms={[]} onChange={onChange} />);

    await user.click(screen.getByText("Añadir"));
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("DateRangePicker", () => {
  it("renderiza dos inputs de fecha", () => {
    render(<DateRangePicker onChange={() => {}} />);
    expect(screen.getByLabelText("Desde")).toBeInTheDocument();
    expect(screen.getByLabelText("Hasta")).toBeInTheDocument();
  });

  it("llama onChange con el valor actualizado", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateRangePicker from="2024-01-01" onChange={onChange} />);

    const toInput = screen.getByLabelText("Hasta");
    await user.type(toInput, "2024-12-31");

    expect(onChange).toHaveBeenCalled();
  });
});

describe("SemanticPaginator", () => {
  it("no renderiza nada si total es 0", () => {
    const { container } = render(
      <SemanticPaginator total={0} nextCursor={null} prevCursor={null} onNavigate={() => {}} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("muestra el total de resultados", () => {
    render(
      <SemanticPaginator total={150} nextCursor="2024-010-5" prevCursor={null} onNavigate={() => {}} />
    );
    expect(screen.getByText("150 resultados")).toBeInTheDocument();
  });

  it("deshabilita Anterior si no hay prevCursor", () => {
    render(
      <SemanticPaginator total={100} nextCursor="c" prevCursor={null} onNavigate={() => {}} />
    );
    expect(screen.getByText(/Anterior/)).toBeDisabled();
  });

  it("deshabilita Siguiente si no hay nextCursor", () => {
    render(
      <SemanticPaginator total={100} nextCursor={null} prevCursor="c" onNavigate={() => {}} />
    );
    expect(screen.getByText(/Siguiente/)).toBeDisabled();
  });

  it("llama onNavigate con nextCursor al clicar Siguiente", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <SemanticPaginator total={100} nextCursor="2024-010-5" prevCursor="p" onNavigate={onNavigate} />
    );

    await user.click(screen.getByText(/Siguiente/));
    expect(onNavigate).toHaveBeenCalledWith("2024-010-5");
  });
});
