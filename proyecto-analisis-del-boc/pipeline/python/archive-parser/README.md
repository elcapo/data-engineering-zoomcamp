# Extracción del índice de años

Parser para extraer el índice de años a partir del HTML de la página de archivo del **Boletín Oficial de Canarias (BOC)**.

> [!NOTE]
> La página de archivo del BOC lista todos los años disponibles con un enlace a cada uno. Este parser extrae esos enlaces para que el pipeline pueda iterar sobre los años y descargar los boletines correspondientes.

## Qué hace

Dado el HTML de la página de archivo del BOC (por ejemplo [`archive.html`](./examples/archive.html)), extrae la lista de años con sus enlaces absolutos y la devuelve como JSON:

```bash
uv run archive-parser archive.html
```

```json
[
  {
    "year": "2026",
    "absolute_link": "https://www.gobiernodecanarias.org/boc/archivo/2026/"
  },
  {
    "year": "2025",
    "absolute_link": "https://www.gobiernodecanarias.org/boc/archivo/2025/"
  }
]
```

## Estructura del proyecto

```
archive-parser/
├── archive_parser/
│   ├── __init__.py
│   ├── cli.py        # Punto de entrada CLI
│   └── parser.py     # Lógica de parsing
├── examples/
│   └── archive.html  # Ejemplo real de la página de archivo
└── tests/
    ├── conftest.py
    └── test_parser.py
```

## Instalación

Para la instalación de dependencias se requiere [uv](https://docs.astral.sh/uv/).

```bash
uv sync
```

## Uso

Puedes usar `archive-parser` para parsear el HTML y mostrar el JSON resultante por la salida estándar.

```bash
uv run archive-parser archive.html
```

También puedes guardar el resultado en un archivo.

```bash
uv run archive-parser archive.html -o year_index.json
```

O usar el parser como librería en Python.

```python
from archive_parser.parser import parse_year_index

html = open("archive.html").read()
years = parse_year_index(html)
print(years[0]["year"])
```

## Tests

Puedes ejecutar la suite completa de tests unitarios con `pytest`.

```bash
uv run pytest
```

Y, si quieres más detalle, pedirlo con el argumento `-v`.

```bash
uv run pytest -v
```

## Dependencias

- **[BeautifulSoup4](https://www.crummy.com/software/BeautifulSoup/)**: para parsear y recorrer HTML.
- **pytest** (desarrollo): para implementar y ejecutar tests unitarios.
