import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateRangePicker } from "@/components/search/DateRangePicker";
import { SemanticPaginator } from "@/components/search/SemanticPaginator";

describe("DateRangePicker", () => {
  it("renderiza dos inputs con placeholder dd/mm/aaaa", () => {
    render(<DateRangePicker onChange={() => {}} />);
    expect(screen.getByLabelText("Desde")).toHaveAttribute("placeholder", "dd/mm/aaaa");
    expect(screen.getByLabelText("Hasta")).toHaveAttribute("placeholder", "dd/mm/aaaa");
  });

  it("muestra la fecha en formato DD/MM/YYYY", () => {
    render(<DateRangePicker from="2024-01-15" to="2024-12-31" onChange={() => {}} />);
    expect(screen.getByLabelText("Desde")).toHaveValue("15/01/2024");
    expect(screen.getByLabelText("Hasta")).toHaveValue("31/12/2024");
  });

  it("usa inputMode numeric para teclado numérico en móvil", () => {
    render(<DateRangePicker onChange={() => {}} />);
    expect(screen.getByLabelText("Desde")).toHaveAttribute("inputMode", "numeric");
    expect(screen.getByLabelText("Hasta")).toHaveAttribute("inputMode", "numeric");
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
