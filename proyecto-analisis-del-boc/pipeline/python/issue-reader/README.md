# issue-reader

Herramienta para extraer las disposiciones de un boletín del BOC publicado en PDF.

Algunos boletines (p. ej. 2002/084, 2006/071) se publicaron únicamente como PDF, sin página HTML de índice. `issue-reader` lee esos PDFs con `pdfplumber` y produce un JSON estructurado idéntico al que genera `issue-parser` a partir del HTML.

## Instalación

```bash
pip install -e .
```

Requisitos: Python 3.12, pdfplumber >= 0.11.9.

## Uso

### CLI

```bash
issue-reader boc-2001-121.pdf
issue-reader boc-2001-121.pdf --indent 2
issue-reader boc-2001-121.pdf > issue.json
```

El JSON se escribe a stdout con caracteres Unicode sin escapar (`ensure_ascii=False`).

### API Python

```python
from issue_reader import read, read_to_json

data = read("boc-2001-121.pdf")
print(data["year"])                  # 2001
print(len(data["dispositions"]))     # 55

json_str = read_to_json("boc-2001-121.pdf", indent=2)
```

## Formato de salida

```json
{
  "year": 2001,
  "issue": 121,
  "title": "BOC Nº 121. Viernes, 14 de septiembre de 2001",
  "url": "https://www.gobiernodecanarias.org/boc/2001/121/",
  "summary": {
    "url": "https://www.gobiernodecanarias.org/boc/2001/121/boc-2001-121.pdf",
    "signature": null
  },
  "dispositions": [
    {
      "disposition": 1,
      "section": "II. AUTORIDADES Y PERSONAL",
      "subsection": "Oposiciones y concursos",
      "organization": "Consejería de Presidencia e Innovación Tecnológica",
      "summary": "Dirección General de Relaciones con la Administración de Justicia.- Resolución de 5 de septiembre de 2001, ...",
      "metadata": null,
      "identifier": null,
      "pdf": "https://www.gobiernodecanarias.org/boc/2001/121/boc-2001-121.pdf",
      "html": null,
      "signature": null
    }
  ]
}
```

Los campos `metadata`, `identifier`, `html` y `signature` se reservan para futura expansión y actualmente son `null`.

## Arquitectura

El sistema de parseo es extensible mediante lectores de formato:

```
issue_reader/
├── reader.py              # API pública: read(), read_to_json()
├── cli.py                 # Punto de entrada CLI
└── formats/
    ├── __init__.py        # Registro READERS (lista ordenada por especificidad)
    ├── base.py            # FormatReader (clase abstracta) y utilidades
    ├── format_2001.py     # Format2001Reader — PDFs del periodo 2001-2002
    └── format_2006.py     # Format2006Reader — PDFs del periodo 2006+
```

`reader.py` recorre la lista `READERS` y usa el primer lector cuyo `detect()` devuelva `True`. Para soportar un nuevo formato de PDF basta con:

1. Crear una subclase de `FormatReader` con `detect()` y `read()`.
2. Añadirla a la lista `READERS` en `formats/__init__.py`.

### Format2001Reader

Maneja los PDFs del BOC de principios de los 2000 (p. ej. `boc-2001-121.pdf`). Estrategia de parseo:

- **Detección**: la primera página contiene "Número \d+" y el PDF tiene referencias "Página \d+".
- **Extracción de líneas**: agrupa los caracteres del PDF por posición vertical (tolerancia 0.1pt), calcula la fuente dominante y el tamaño mediano de cada línea, y filtra cabeceras y pies de página.
- **Máquina de estados**: clasifica cada línea según su fuente:
  - **Negrita + número romano** → sección (I., II., III., IV.)
  - **Cursiva** → subsección
  - **Negrita** → organización
  - **Texto normal** → resumen de la disposición
  - **"Página \d+"** → cierra la disposición actual
- **Maquetación a dos columnas**: detecta secciones duplicadas como señal de que comienza el cuerpo del boletín y deja de procesar.
- **Limpieza de texto**: normaliza espacios, reúne palabras partidas por guión entre líneas ("tempo- ral" → "temporal").

### Format2006Reader

Maneja los PDFs del BOC a partir de 2006 (p. ej. `boc-2006-071.pdf`), que tienen un formato de cabecera diferente. Estrategia de parseo:

- **Detección**: busca "Boletín Oficial de Canarias núm. \d+" en las cabeceras interiores (páginas 1+), ya que la primera página solo muestra el número del boletín en grande.
- **Extracción de metadatos**: año, número y fecha se obtienen de las cabeceras interiores (no de la primera línea como en 2001).
- **Extracción de líneas**: usa una tolerancia vertical más amplia (3pt) para agrupar caracteres, lo que permite fusionar correctamente las referencias "Página" con el texto circundante que aparece a diferente posición vertical. Solo considera la fuente de los caracteres en la columna izquierda (x < 450pt) para evitar que los dígitos de "Página" alteren la fuente dominante.
- **Decoraciones de cabecera**: filtra el número del boletín (Courier grande) y fragmentos de fecha (Helvetica) que aparecen como elementos decorativos en la primera página.
- **Corrección de artefactos PDF**: repara palabras concatenadas ("AdministraciónLocal" → "Administración Local", "III.Otras" → "III. Otras", "Insularde" → "Insular de").
- **Máquina de estados**: misma lógica que Format2001Reader (negrita + número romano → sección, cursiva → subsección, etc.).

## Tests

```bash
pytest
```

45 tests que cubren la API pública, la detección de formato, la extracción de metadatos, el conteo de disposiciones, la integridad del texto y el manejo de maquetación a dos columnas. Los PDFs de referencia son `examples/boc-2001-121.pdf` (formato 2001, 55 disposiciones) y `examples/boc-2006-071.pdf` (formato 2006, 14 disposiciones).

## Ejemplos

La carpeta `examples/` contiene 8 PDFs de muestra del periodo 2001-2006 usados para desarrollo y testing.
