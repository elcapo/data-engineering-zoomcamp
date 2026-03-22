# Archivo (índice de años)

## URL

```
https://www.gobiernodecanarias.org/boc/archivo/
```

## Descripción

Es la página de entrada del archivo histórico del BOC. Lista todos los años para los que hay boletines publicados, con un enlace a cada uno de ellos.

Es el punto de partida de todo el pipeline de descarga.

## Captura de pantalla

![Página de archivo del BOC](./screenshots/01-archivo.png)

## Almacenamiento

El HTML se guarda comprimido y sin modificar en el bucket `boc-raw`:

```
boc-raw/
└── archive/
    └── archive.html.gz
```

## Flujos implicados

| Flujo | Descripción |
|-------|-------------|
| `main_boc.download_archive` | Descarga el HTML y lo guarda en MinIO |
| `main_boc.extract_archive` | Parsea el HTML y extrae los enlaces a los índices de cada año |

## Salida

Lista de URLs con el formato `/boc/archivo/{año}/`, una por cada año disponible en el archivo.
