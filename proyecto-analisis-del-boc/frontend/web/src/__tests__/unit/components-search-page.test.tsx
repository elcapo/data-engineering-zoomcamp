import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { SearchPage } from "@/components/search/SearchPage";

// Mock next/navigation
const mockPush = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const fakeResult = {
  results: [
    { year: 2024, issue: 10, number: "3", section: "I", subsection: "", organization: "Consejería", title: "Test", date: "2024-01-01", pdfUrl: "", excerpt: "Texto de <mark>prueba</mark>" },
    { year: 2023, issue: 5, number: "1", section: "II", subsection: "", organization: "ULPGC", title: "Otra", date: "2023-06-01", pdfUrl: "", excerpt: null },
  ],
  total: 2,
  nextCursor: null,
  prevCursor: null,
  facets: {
    byYear: [{ label: "2024", count: 1 }, { label: "2023", count: 1 }],
    bySection: [{ label: "I", count: 1 }, { label: "II", count: 1 }],
    byOrg: [{ label: "Consejería", count: 1 }, { label: "ULPGC", count: 1 }],
  },
};

beforeEach(() => {
  mockPush.mockReset();
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(fakeResult) });
  mockSearchParams = new URLSearchParams();
});

describe("SearchPage", () => {
  it("muestra mensaje inicial cuando no hay parámetros", () => {
    render(<SearchPage />);
    expect(screen.getByText(/Usa los filtros/)).toBeInTheDocument();
  });

  it("hace fetch y muestra resultados cuando hay parámetros en la URL", async () => {
    mockSearchParams = new URLSearchParams("q=test");
    render(<SearchPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByText("Test")).toBeInTheDocument();
      expect(screen.getByText("Otra")).toBeInTheDocument();
    });
  });

  it("muestra el total de resultados", async () => {
    mockSearchParams = new URLSearchParams("q=test");
    render(<SearchPage />);
    await waitFor(() => {
      expect(screen.getAllByText("2 resultados").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("muestra mensaje de sin resultados", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ results: [], total: 0, nextCursor: null, prevCursor: null, facets: { byYear: [], bySection: [], byOrg: [] } }),
    });
    mockSearchParams = new URLSearchParams("q=xzqwerty");
    render(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByText(/Sin resultados/)).toBeInTheDocument();
    });
  });

  it("muestra error cuando la API falla", async () => {
    mockFetch.mockResolvedValue({ ok: false });
    mockSearchParams = new URLSearchParams("q=test");
    render(<SearchPage />);
    await waitFor(() => {
      expect(screen.getByText(/Error en la búsqueda/)).toBeInTheDocument();
    });
  });

  it("reconstruye términos include/exclude desde la URL", () => {
    mockSearchParams = new URLSearchParams("include=beca&include=ayuda&exclude=universidad");
    render(<SearchPage />);
    expect(screen.getByText("beca")).toBeInTheDocument();
    expect(screen.getByText("ayuda")).toBeInTheDocument();
    expect(screen.getByText(/universidad/)).toBeInTheDocument();
  });
});
