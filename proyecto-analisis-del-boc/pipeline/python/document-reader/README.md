# document-reader

Lee un PDF del Boletín Oficial de Canarias y lo convierte a Markdown con frontmatter YAML.

Existen dos formatos de entrada:

- **PDF por disposición** (era moderna, p. ej. `boc-a-2019-229-5624.pdf`). Cada PDF contiene una sola disposición. Lo gestiona `FormatModernReader`.
- **PDF del boletín completo** (p. ej. `boc-2006-071.pdf`, hermano de los ejemplos de `issue-reader`). Algunos boletines antiguos no se publicaron como PDFs por disposición sino como un único PDF a dos columnas con todas las disposiciones del boletín. Cada disposición aparece introducida por su número global (p. ej. `473`, `474`, `475`…) en negrita, seguido por el título en cursiva. Lo gestiona `Format2006Reader`, que parte el flujo de texto en cada número global y devuelve una lista de disposiciones.

`document-reader` detecta el formato automáticamente y dispatcha al lector correcto.

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
from document_reader import read, read_all

# PDF por disposición (formato moderno) → un único Markdown.
markdown = read("boc-a-2019-229-5624.pdf")

# PDF de boletín completo (formato 2006) → un Markdown por disposición.
for md in read_all("boc-2006-071.pdf"):
    print(md)
```

`read_all` también funciona con PDFs por disposición; en ese caso devuelve una lista con un solo elemento.

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

## Arquitectura

```
document_reader/
├── reader.py             # API pública: read(), read_all(), read_file()
├── cli.py                # Punto de entrada CLI
└── formats/
    ├── __init__.py       # Lista READERS (más específico primero)
    ├── base.py           # Document, FormatReader (ABC), build_markdown
    ├── format_modern.py  # FormatModernReader — PDFs por disposición
    └── format_2006.py    # Format2006Reader — boletín completo a 2 columnas
```

`reader.py` recorre `READERS` y usa el primer lector cuyo `detect()` devuelve `True`. Cada lector implementa `read(pdf) -> list[Document]`; los PDFs por disposición devuelven un único `Document`, los boletines completos devuelven uno por disposición.

### FormatModernReader

Para PDFs como `boc-a-2019-229-5624.pdf`. Estrategia:

- **Detección**: cualquier página contiene el identificador canónico `boc-a-AAAA-NNN-NNNN` en el pie.
- **Cabecera** (parte superior, 9 pt): contiene "Boletín Oficial de Canarias núm. NN" y la fecha. De aquí se extraen el año, el número de boletín y la fecha de publicación.
- **Pie** (parte inferior, 7 pt): contiene la URL canónica con el identificador `boc-a-AAAA-NNN-NNNN`. De aquí se extrae el código CVE y se construye la URL del PDF.
- **Sección** (Times-Bold ≥ 13 pt), **organización** (Times-Bold 11 pt), **título** (Times-Bold + Times-Italic), **cuerpo** (Times-Roman 11 pt): clasificación por fuente y tamaño.
- **Cuerpo**: las líneas se agrupan en párrafos detectando los huecos verticales mayores de ~1.6× la altura típica de línea. Las palabras partidas con guión entre líneas (`tempo- ral`) se reconstruyen.

### Format2006Reader

Para boletines completos como `boc-2006-071.pdf`, donde **todas** las disposiciones comparten un único PDF a dos columnas. Estrategia:

- **Detección**: cualquiera de las primeras páginas contiene la cabecera interior `Boletín Oficial de Canarias núm. NN, <fecha> de <año>`.
- **Lectura por columnas**: los caracteres se separan en columna izquierda (x < 290 pt) y columna derecha. Cada columna se lee íntegra de arriba abajo antes de pasar a la siguiente.
- **Salto del sumario**: el sumario termina en la última referencia "Página N" de cada columna; las líneas hasta esa marca se descartan. El cuerpo empieza al ver la primera cabecera de sección a 13 pt.
- **Partido por número global**: la frontera entre disposiciones es la línea cuyo primer carácter es Times-Bold y cuyo texto empieza por un entero (p. ej. `473ORDEN…`). El número se extrae del prefijo y el resto pasa al título; las líneas en cursiva inmediatamente posteriores se concatenan como continuación del título.
- **Organización**: las líneas en negrita aisladas (no cabecera de sección) se acumulan como organización para la siguiente disposición. Una nueva línea en negrita cierra la disposición actual.
- **Cuerpo**: todo lo que no sea sección, organización o título acumula como párrafos del cuerpo, agrupados igual que en el lector moderno.

## Tests

```bash
uv run pytest
```

51 tests cubren ambos lectores. PDFs de referencia:

- `examples/boc-a-2019-229-5624.pdf` — edicto judicial de 2019, una sola página (FormatModernReader).
- `../issue-reader/examples/boc-2006-071.pdf` — boletín completo con 14 disposiciones a dos columnas (Format2006Reader).
