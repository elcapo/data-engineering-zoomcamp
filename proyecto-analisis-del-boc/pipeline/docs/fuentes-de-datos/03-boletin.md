# Índice de disposiciones de un boletín

## URL

```
https://www.gobiernodecanarias.org/boc/{año}/{número}/index.html
```

Ejemplo: `https://www.gobiernodecanarias.org/boc/2026/001/index.html`

## Descripción

Una página por cada boletín publicado. Lista todas las disposiciones (leyes, decretos, resoluciones, etc.) incluidas en ese número, organizadas por sección. Cada entrada incluye el título de la disposición y un enlace a su texto completo.

## Captura de pantalla

![Índice de disposiciones de un boletín](./screenshots/03-boletin.png)

## Almacenamiento

El HTML se guarda comprimido y sin modificar en el bucket `boc-raw`:

```
boc-raw/
└── issues/
    ├── 2026-001.html.gz
    ├── 2026-002.html.gz
    └── ...
```

## Flujos implicados

| Flujo | Descripción |
|-------|-------------|
| `main_boc.download_issues` | Descarga el HTML de cada boletín y lo guarda en MinIO |
| `main_boc.extract_issues` | Parsea el HTML y extrae los enlaces a cada disposición |

## Salida

Lista de URLs con el formato `/boc/{año}/{número}/{disposición}.html`, una por cada disposición del boletín.
