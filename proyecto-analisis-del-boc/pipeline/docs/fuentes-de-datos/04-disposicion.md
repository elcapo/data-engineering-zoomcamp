# Texto completo de una disposición

## URL

```
https://www.gobiernodecanarias.org/boc/{año}/{número}/{disposición}.html
```

Ejemplo: `https://www.gobiernodecanarias.org/boc/2026/001/001.html`

## Descripción

Una página por cada disposición publicada en el BOC. Contiene el texto íntegro de la disposición (ley, decreto, resolución, anuncio, etc.) en formato HTML. Es el nivel más granular del archivo y el dato de mayor valor para el análisis.

## Captura de pantalla

![Texto completo de una disposición](./screenshots/04-disposicion.png)

## Almacenamiento

El HTML se guarda comprimido y sin modificar en el bucket `boc-raw`, organizado en subdirectorios por año y número de boletín:

```
boc-raw/
└── documents/
    └── 2026/
        └── 001/
            ├── 001.html.gz
            ├── 002.html.gz
            └── ...
```

## Flujos implicados

| Flujo | Descripción |
|-------|-------------|
| `main_boc.download_documents` | Descarga el HTML de cada disposición y lo guarda en `boc-raw` |
| `main_boc.extract_documents` | Convierte el HTML a Markdown, lo guarda en `boc-markdown` y carga los datos en PostgreSQL |

## Salida

### Bucket `boc-markdown`

El texto de cada disposición se convierte a Markdown (con YAML frontmatter) y se guarda comprimido, con la misma estructura que en `boc-raw`:

```
boc-markdown/
└── documents/
    └── 2026/
        └── 001/
            ├── 001.md.gz
            ├── 002.md.gz
            └── ...
```

### Tabla PostgreSQL `boc_dataset.document`

Los campos estructurados del frontmatter y el cuerpo del texto se cargan en PostgreSQL mediante dlt:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `year` | integer | Año del boletín |
| `issue` | integer | Número de boletín |
| `number` | text | Número de disposición dentro del boletín |
| `document` | text | Código de documento (`documentnumber` del HTML) |
| `date` | text | Fecha de la disposición |
| `entity` | text | Entidad emisora |
| `section` | text | Sección del boletín |
| `subsection` | text | Subsección (si existe) |
| `organization` | text | Organismo concreto |
| `identifier` | text | Código CVE de verificación |
| `pdf` | text | URL al PDF oficial |
| `signature` | text | URL a la firma electrónica |
| `title` | text | Título de la disposición |
| `body` | text | Cuerpo del texto en formato Markdown |
| `body_tsv` | tsvector | Índice de búsqueda de texto completo (`title \|\| body`, configuración `spanish`) |

La columna `body_tsv` es una columna generada (`GENERATED ALWAYS AS ... STORED`) con un índice GIN, lo que permite búsquedas eficientes con el operador `@@`:

```sql
SELECT title, date
FROM boc_dataset.document
WHERE body_tsv @@ to_tsquery('spanish', 'vivienda & canarias');
```
