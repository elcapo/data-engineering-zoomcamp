# document-parser

Convierte la página HTML de un documento individual del Boletín Oficial de Canarias (BOC) a un fichero Markdown limpio.

La salida sigue el formato estándar de documento Markdown con frontmatter YAML: los metadatos estructurados (año, sección, identificador, enlaces…) van en la cabecera y el texto completo de la disposición va como cuerpo Markdown.

## Uso

```bash
uv run document-parser <archivo.html>
uv run document-parser <archivo.html> -o salida.md
```

## Salida

```markdown
---
year: 2026
issue: 1
document: "001"
number: "1"
date: "2026-01-02"
entity: "Consejería de Presidencia, Administraciones Públicas, Justicia y Seguridad"
section: "II. Autoridades y personal"
subsection: "Oposiciones y concursos"
organization: "Consejería de Presidencia, Administraciones Públicas, Justicia y Seguridad"
number: "1"
identifier: "BOC-A-2026-001-1"
pdf: "https://sede.gobiernodecanarias.org/boc/boc-a-2026-001-1.pdf"
signature: "https://sede.gobiernodecanarias.org/boc/boc-a-2026-001-1.xsign"
---

# ORDEN de 22 de diciembre de 2025, por la que se declara desierto…

Por Resolución de la Secretaría General Técnica de la Consejería…

…

Nieves Lady Barreto Hernández.
```

### Campos del frontmatter

| Campo | Descripción |
|---|---|
| `year` / `issue` | Año y número del boletín |
| `document` | Número del documento dentro del boletín |
| `number` | Número de la disposición dentro del boletín |
| `date` | Fecha de publicación (ISO 8601) |
| `entity` | Organismo emisor (consejería, presidencia, etc.) |
| `section` | Sección del boletín |
| `subsection` | Subsección si existe (p. ej. "Oposiciones y concursos"); ausente en formato histórico |
| `organization` | Organismo concreto dentro de la sección |
| `identifier` | Código CVE (p. ej. `BOC-A-2026-001-1`); ausente en formato histórico |
| `pdf` | URL absoluta al PDF de la disposición |
| `signature` | URL de la firma electrónica; ausente en formato histórico |

Los campos opcionales se omiten del frontmatter cuando no están disponibles.

## Formatos soportados

El parser detecta automáticamente el formato de la página:

- **Formato moderno (circa 2026):** incluye `<span class="cve">` con identificador CVE y enlace de firma electrónica. Las secciones pueden tener subsección.
- **Formato histórico (circa 1980):** estructura más sencilla con enlace PDF directo, sin CVE ni firma. No tiene subsección.

## Generación del Markdown

El cuerpo del documento se extrae de los párrafos `<p>` que siguen al encabezado `<h3>` dentro de `<div class="conten">`. Se omiten el párrafo de descarga PDF (formato histórico) y el bloque de metadatos CVE (formato moderno). Los saltos de línea `<br/>` se conservan dentro del párrafo; los párrafos se separan con línea en blanco.

## Desarrollo

```bash
uv run pytest
```

Los ejemplos de referencia están en `examples/`:
- `1980-001-001.html` — primer documento del BOC, formato histórico
- `2026-001-001.html` — primer documento del BOC 2026, formato moderno
