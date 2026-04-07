# document-reader

Lee el PDF de una disposición individual del Boletín Oficial de Canarias y lo convierte a Markdown con frontmatter YAML.

Esta herramienta es la análoga a [`document-parser`](../document-parser) pero opera sobre PDFs en lugar de HTML, igual que [`issue-reader`](../issue-reader) hace para los boletines completos cuando no hay HTML disponible. Algunos años del BOC publican las disposiciones únicamente como PDF (sin página HTML acompañante) y `document-reader` permite generar el Markdown estándar a partir de ese PDF.

## Instalación

```bash
uv sync
```

Requisitos: Python 3.11+, pdfplumber >= 0.11.9.

## Uso

### CLI

```bash
uv run document-reader boc-a-2019-229-5624.pdf
uv run document-reader boc-a-2019-229-5624.pdf -o disposicion.md
```

### API Python

```python
from document_reader import read

markdown = read("boc-a-2019-229-5624.pdf")
print(markdown)
```

## Salida

```markdown
---
year: 2019
issue: 229
number: 5624
date: "2019-11-26"
entity: "Juzgado de Primera Instancia nº 2 de San Bartolomé de Tirajana"
section: "IV. Administración de Justicia"
organization: "Juzgado de Primera Instancia nº 2 de San Bartolomé de Tirajana"
identifier: "BOC-A-2019-229-5624"
pdf: "https://sede.gobiernodecanarias.org/boc/boc-a-2019-229-5624.pdf"
---

# EDICTO de 11 de julio de 2019, relativo al fallo de la sentencia dictada en los autos de procedimiento ordinario nº 0000233/2018.

D./Dña. Mónica Vera Hartmann, Letrado/a de la Administración de Justicia del Juzgado de Primera Instancia nº 2 de San Bartolomé de Tirajana y su Partido:

HACE SABER: que en este Juzgado se ha dictado sentencia en los autos que luego se dirá, cuyo encabezamiento y fallo tienen el siguiente tenor literal:

…
```

### Campos del frontmatter

| Campo | Descripción |
|---|---|
| `year` | Año del boletín |
| `issue` | Número del boletín |
| `number` | Número de la disposición dentro del boletín |
| `date` | Fecha de publicación (ISO 8601) |
| `entity` | Organismo emisor (mismo valor que `organization`, replicado por compatibilidad con `document-parser`) |
| `section` | Sección del boletín (p. ej. "IV. Administración de Justicia") |
| `organization` | Organismo emisor |
| `identifier` | Código CVE de la disposición (p. ej. `BOC-A-2019-229-5624`) |
| `pdf` | URL absoluta al PDF de la disposición |

Los campos opcionales se omiten cuando no se pueden extraer del PDF.

## Estrategia de parseo

El PDF se lee con `pdfplumber` y los caracteres se agrupan en líneas visuales con tolerancia vertical de 3 pt para fusionar las versales pequeñas (`HACE SABER:`, `FALLO:`) con su línea de cuerpo. Cada línea queda anotada con su fuente dominante y tamaño mediano.

A partir de las anotaciones de fuente se aplica la siguiente clasificación:

- **Cabecera** (parte superior, 9 pt): contiene "Boletín Oficial de Canarias núm. NN" y la fecha. De aquí se extraen el año, el número de boletín y la fecha de publicación.
- **Pie** (parte inferior, 7 pt): contiene la URL canónica con el identificador `boc-a-AAAA-NNN-NNNN`. De aquí se extrae el código CVE y se construye la URL del PDF.
- **Sección** (Times-Bold ≥ 13 pt): la primera línea en negrita grande del documento.
- **Organización** (Times-Bold 11 pt): la siguiente línea en negrita.
- **Título** (Times-Bold + Times-Italic): la línea que comienza por el número de la disposición seguido del texto en cursiva. Las líneas siguientes en cursiva pura se concatenan como continuación del título.
- **Cuerpo** (Times-Roman 11 pt): el resto del texto. Las líneas se agrupan en párrafos detectando los huecos verticales mayores de ~1.6× la altura típica de línea. Las palabras partidas con guión entre líneas (`tempo- ral`) se reconstruyen.

## Tests

```bash
uv run pytest
```

Los PDFs de referencia están en `examples/`:

- `boc-a-2019-229-5624.pdf` — edicto judicial de 2019, una sola página.
