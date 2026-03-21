# Extracción del índice de boletines de un año

Parser para extraer el listado de boletines publicados en un año a partir del HTML de su página de archivo del **Boletín Oficial de Canarias (BOC)**.

> [!NOTE]
> Cada año tiene una página de archivo en gobiernodecanarias.org/boc que lista todos los boletines publicados ese año con un enlace a cada uno. Este parser extrae esos enlaces para que el pipeline pueda iterar sobre ellos y descargar los boletines correspondientes.

## Qué hace

Dado el HTML de la página de archivo de un año (por ejemplo [`2025.html`](./examples/2025.html)), extrae la lista de boletines con su etiqueta, enlace absoluto, año y número de boletín:

```bash
uv run year-parser 2025.html
```

```json
[
  {
    "label": "BOC Nº 1 - 2 de enero de 2025 - Jueves",
    "url": "https://www.gobiernodecanarias.org/boc/2025/001/index.html",
    "year": 2025,
    "issue": 1
  },
  {
    "label": "BOC Nº 2 - 3 de enero de 2025 - Viernes",
    "url": "https://www.gobiernodecanarias.org/boc/2025/002/index.html",
    "year": 2025,
    "issue": 2
  }
]
```

## Formatos soportados

El BOC ha cambiado la estructura de estas páginas a lo largo de los años. El parser detecta automáticamente ambos formatos por la forma del `href`:

| Formato | `href` de ejemplo | Ejemplo |
|---------|-------------------|---------|
| Moderno | `/boc/2025/001/index.html` | `2025.html` |
| Histórico | `/boc/1980/001/` | `1980.html` |

En el formato histórico cada entrada de boletín va acompañada de enlaces PDF adicionales; el parser los descarta y devuelve solo los enlaces al boletín.

## Estructura del proyecto

```
year-parser/
├── year_parser/
│   ├── __init__.py
│   ├── cli.py        # Punto de entrada CLI
│   └── parser.py     # Lógica de parsing
├── examples/
│   ├── 2025.html     # Ejemplo formato moderno
│   └── 1980.html     # Ejemplo formato histórico
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

Puedes usar `year-parser` para parsear el HTML y mostrar el JSON resultante por la salida estándar.

```bash
uv run year-parser 2025.html
```

También puedes guardar el resultado en un archivo.

```bash
uv run year-parser 2025.html -o issues_2025.json
```

O usar el parser como librería en Python.

```python
from year_parser.parser import parse_issue_index

html = open("2025.html").read()
issues = parse_issue_index(html)
print(issues[0]["label"])
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
