# Fuentes de datos

El proyecto descarga y procesa datos del **Boletín Oficial de Canarias (BOC)**, publicado en el sitio web del Gobierno de Canarias. La descarga se realiza en cuatro niveles jerárquicos, de mayor a menor granularidad:

| # | Fuente | URL base | Almacenamiento en `boc-raw` |
|---|--------|----------|-----------------------------|
| 1 | [Archivo (índice de años)](./01-archivo.md) | `/boc/archivo/` | `archive/archive.html` |
| 2 | [Índice de boletines de un año](./02-anio.md) | `/boc/archivo/{año}/` | `years/{año}.html` |
| 3 | [Índice de disposiciones de un boletín](./03-boletin.md) | `/boc/{año}/{boletín}/index.html` | `issues/{año}-{boletín}.html` |
| 4 | [Texto completo de una disposición](./04-disposicion.md) | `/boc/{año}/{boletín}/{disposición}.html` | `documents/{año}/{boletín}/{disposición}.html` |

## Flujo de descarga

```
Archivo (lista de años)
    │
    └─→ Índice del año (lista de boletines)
             │
             └─→ Índice del boletín (lista de disposiciones)
                      │
                      └─→ Texto completo de cada disposición
```

Cada nivel se descarga primero como HTML sin procesar en el bucket `boc-raw` de MinIO, y luego se parsea para extraer los enlaces al nivel siguiente.
