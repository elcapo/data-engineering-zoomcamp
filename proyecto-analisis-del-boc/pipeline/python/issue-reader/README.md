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
    └── format_2001.py     # Format2001Reader — PDFs del periodo 2001-2006
```

`reader.py` recorre la lista `READERS` y usa el primer lector cuyo `detect()` devuelva `True`. Para soportar un nuevo formato de PDF basta con:

1. Crear una subclase de `FormatReader` con `detect()` y `read()`.
2. Añadirla a la lista `READERS` en `formats/__init__.py`.

### Format2001Reader

Maneja los PDFs del BOC de principios de los 2000. Estrategia de parseo:

- **Detección**: la primera página contiene "Número \d+" y el PDF tiene referencias "Página \d+".
- **Extracción de líneas**: agrupa los caracteres del PDF por posición vertical, calcula la fuente dominante y el tamaño mediano de cada línea, y filtra cabeceras y pies de página.
- **Máquina de estados**: clasifica cada línea según su fuente:
  - **Negrita + número romano** → sección (I., II., III., IV.)
  - **Cursiva** → subsección
  - **Negrita** → organización
  - **Texto normal** → resumen de la disposición
  - **"Página \d+"** → cierra la disposición actual
- **Maquetación a dos columnas**: detecta secciones duplicadas como señal de que comienza el cuerpo del boletín y deja de procesar.
- **Limpieza de texto**: normaliza espacios, reúne palabras partidas por guión entre líneas ("tempo- ral" → "temporal").

## Tests

```bash
pytest
```

24 tests que cubren la API pública, la detección de formato, la extracción de metadatos, el conteo de disposiciones, la integridad del texto y el manejo de maquetación a dos columnas. El PDF de referencia para los tests es `examples/boc-2001-121.pdf`.

## Ejemplos

La carpeta `examples/` contiene 8 PDFs de muestra del periodo 2001-2006 usados para desarrollo y testing.
