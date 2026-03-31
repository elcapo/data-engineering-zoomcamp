# Plan de Trabajo — BOC Canarias Web

> Basado en `SPEC.md` v0.1 (2026-03-25)

---

## Resumen de Fases

| # | Fase | Descripción |
|---|---|---|
| 1 | Scaffolding y configuración | Proyecto Next.js, Tailwind, Prisma, Docker |
| 2 | Capa de datos | Schema Prisma, repositorios, tipos de dominio |
| 3 | API Routes | `/api/bulletins`, `/api/search`, `/api/metrics` |
| 4 | Contenidos estáticos | Directorio `content/`, Markdown editorial |
| 5 | Componentes base | Componentes UI reutilizables |
| 6 | Página de Inicio | `/` — bloques configurables vía `sections.yaml` |
| 7 | Búsqueda | `/buscar` — filtros, full-text, paginación semántica |
| 8 | Métricas | `/metricas` — gráficas de cobertura |
| 9 | Páginas estáticas | `/metodologia`, `/aviso-legal`, `/sobre-el-proyecto` |
| 10 | Página de disposición | `/disposicion/[year]/[issue]/[number]` |
| 11 | SEO y sitemap | Metadatos dinámicos, `next-sitemap` |

---

## Fase 1 — Scaffolding y Configuración

### 1.1 Inicializar proyecto Next.js

- `npx create-next-app@latest` con App Router, TypeScript y Tailwind CSS
- Estructura de directorios según `SPEC.md §9`:
  `src/app/`, `src/components/`, `src/lib/`, `src/types/`, `content/`, `prisma/`, `public/`

### 1.2 Dependencias

```
next@latest react react-dom
prisma @prisma/client
gray-matter remark remark-html
recharts          ← decisión provisional (ver §10 de SPEC)
next-sitemap
js-yaml           ← para leer sections.yaml
```

### 1.3 Variables de Entorno

Prisma requiere `DATABASE_URL`. El fichero `.env.example` (a crear en `frontend/`) expondrá
**todas** las variables necesarias con valores por defecto seguros:

```
# Conexión a PostgreSQL (boc_dataset + boc_log)
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/boc

# Descomponible en partes si se prefiere construirla en docker-compose:
# POSTGRES_HOST=localhost
# POSTGRES_PORT=5432
# POSTGRES_DB=boc
# POSTGRES_USER=root
# POSTGRES_PASSWORD=root

# Next.js
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
```

El `docker-compose.yml` del frontend construirá `DATABASE_URL` desde las variables
individuales para mantener el mismo patrón que el pipeline.

### 1.4 Docker

Crear en `frontend/`:

- **`Dockerfile`** — imagen multi-stage:
  1. `deps` — instala dependencias (`npm ci`)
  2. `builder` — ejecuta `prisma generate` + `next build`
  3. `runner` — imagen final `node:alpine`, standalone output

- **`docker-compose.yml`** — servicio `boc-web`:
  - Variables de entorno para `DATABASE_URL` construida desde partes individuales
  - Red externa `boc-postgres-network` (mismo patrón que `postgres/`)
  - `restart: always`

- **`docker-compose.traefik.yml`** — override con labels Traefik (siguiendo patrón de `postgres/docker-compose.traefik.yml`)

- **`.env.example`** — plantilla de configuración

---

## Fase 2 — Capa de Datos

### 2.1 Tipos de Dominio (`src/types/domain.ts`)

Definir las interfaces `Bulletin`, `Disposition` y `DataQualityReport` tal como
se describen en `SPEC.md §4`.

### 2.2 Schema Prisma (`prisma/schema.prisma`)

Mapear las tablas del pipeline a los modelos web:

| Modelo Prisma | Tabla BD |
|---|---|
| `Issue` | `boc_dataset.issue` |
| `Document` | `boc_dataset.document` |
| `IssueDisposition` | `boc_dataset.issue__dispositions` |
| Vistas métricas | `boc_log.metric_download_*`, `boc_log.metric_extraction_*` |

Conexión configurada desde `DATABASE_URL` (env var).

### 2.3 Cliente Prisma (`src/lib/db/prisma.ts`)

Singleton del cliente Prisma compatible con hot-reload de Next.js en desarrollo.

### 2.4 Repositorios

- **`BulletinRepository`** (`src/lib/db/repositories/bulletins.ts`)
  - `findRecent(limit)` — últimos N boletines con conteo de disposiciones por sección
  - `findByYearAndIssue(year, issue)` — boletín individual

- **`DispositionRepository`** (`src/lib/db/repositories/dispositions.ts`)
  - `search(filters, cursor, limit)` — búsqueda full-text con `tsquery`
  - `findByIdentifier(year, issue, number)` — disposición individual

- **`MetricsRepository`** (`src/lib/db/repositories/metrics.ts`)
  - `getDataQualityReport()` — agrega datos de las vistas `boc_log.metric_*`

### 2.5 Constructor de consultas (`src/lib/search/query-builder.ts`)

Convierte los chips booleanos de la UI a expresiones `tsquery` válidas de PostgreSQL
(configuración `spanish`).

---

## Fase 3 — API Routes

### `GET /api/bulletins`

Parámetros: `limit` (por defecto 5).
Devuelve array de `Bulletin`.

### `GET /api/search`

Parámetros completos según `SPEC.md §5.2`: `q`, `section[]`, `subsection[]`, `org`,
`from`, `to`, `year`, `issue`, `cursor`, `limit`.
Devuelve `{ results: Disposition[], nextCursor, prevCursor, total }`.

### `GET /api/metrics`

Sin parámetros. Devuelve `DataQualityReport`.

---

## Fase 4 — Contenidos Estáticos

Crear la estructura `content/` con ficheros iniciales:

```
content/
  home/
    sections.yaml          ← define bloques: latest-bulletins + editorial
    featured/              ← (vacío inicialmente)
  pages/
    aviso-legal.md         ← borrador de SPEC.md §7.1
    metodologia.md         ← borrador de SPEC.md §7.2
    sobre-el-proyecto.md   ← borrador inicial
```

Utilidad `src/lib/content/markdown.ts`:
- `readMarkdownPage(slug)` — lee `content/pages/<slug>.md`, parsea frontmatter con
  `gray-matter` y convierte cuerpo a HTML con `remark`
- `readSectionsConfig()` — lee y parsea `content/home/sections.yaml`

---

## Fase 5 — Componentes Base

Crear los componentes según `SPEC.md §6`, en este orden de dependencias:

**UI genéricos** (`src/components/ui/`):
- `Card`, `Badge`, `Button`, `Spinner`, `MetricBar`

**Layout** (`src/components/layout/`):
- `Header` (con `SearchBar` integrada), `Footer`, `Nav`

**Boletín** (`src/components/bulletin/`):
- `BulletinCard`, `DispositionCard`, `EditorialCard`, `SectionBreadcrumb`

**Búsqueda** (`src/components/search/`):
- `SearchBar`, `FilterPanel`, `BooleanTermInput`, `DateRangePicker`, `SemanticPaginator`

**Métricas** (`src/components/metrics/`):
- `BarChart` (wrapper de Recharts), `MetricKPI`

**Contenido** (`src/components/`):
- `MarkdownPage`

---

## Fase 6 — Página de Inicio (`/`)

- RSC que lee `sections.yaml` y renderiza bloques dinámicamente
- Bloque `latest-bulletins`: llama a `BulletinRepository.findRecent(5)` en servidor
- Bloque `editorial`: renderiza `<EditorialCard>` desde ficheros Markdown en `content/home/featured/`
- Componente `<SearchBar>` redirige a `/buscar?q=...`

---

## Fase 7 — Búsqueda (`/buscar`)

- Page component con estado de URL (`searchParams`)
- `<FilterPanel>` con todos los filtros; estado sincronizado con URL
- `<BooleanTermInput>` con chips verdes/rojos y lógica OR
- Resultados: gráfica de barras por año + lista de `<DispositionCard>`
- `<SemanticPaginator>` con cursor `year-issue-disposition`
- Highlight de coincidencias con `<mark>` (generado en servidor via `ts_headline`)

---

## Fase 8 — Métricas (`/metricas`)

- SSR: llama a `GET /api/metrics`
- Tarjetas KPI: % años, % boletines, % extraídos
- Gráfica de barras horizontales por año (color semafórico)
- Al clic en año: tabla expandible con detalle por boletín
- Gráfica comparativa descarga vs extracción por año
- Enlace a `/metodologia`

---

## Fase 9 — Páginas Estáticas

- `/aviso-legal`, `/metodologia`, `/sobre-el-proyecto`
- SSG: `generateStaticParams` no necesario (rutas fijas)
- Cada página usa `<MarkdownPage>` con el fichero correspondiente de `content/pages/`
- Metadatos `<title>` y `<meta description>` desde frontmatter YAML

---

## Fase 10 — Página de Disposición (`/disposicion/[year]/[issue]/[number]`)

- SSR para indexación SEO
- `DispositionRepository.findByIdentifier(year, issue, number)`
- Muestra texto completo en Markdown, metadatos completos y enlace al PDF oficial
- `generateMetadata` dinámico con título y extracto de la disposición

---

## Fase 11 — Página de Boletín (`/boletin/[year]/[issue]`)

- SSR para indexación SEO
- Muestra el listado de disposiciones de cada boletín

---

## Fase 12 — Página de Año (`/año/[year]`)

- SSR para indexación SEO
- Muestra el listado de boletines de cada año

---

## Fase 13 — SEO y Sitemap

- `generateMetadata` en todas las páginas dinámicas
- `next-sitemap` configurado para incluir boletines y disposiciones, excluir `/buscar`
- `robots.txt` generado automáticamente

---

## Decisiones Tomadas en Este Plan

| Decisión SPEC §10 | Resolución |
|---|---|
| Librería de gráficas | **Recharts** (más sencilla para RSC, sin SVG manual) — revisable |
| Página de detalle de disposición | **Sí existe** como ruta propia (Fase 10) — necesaria para SEO |
| Idioma | Solo castellano |

Las decisiones de licencia, marca y contacto no afectan al desarrollo técnico y se dejan pendientes.

---

## Orden de Ejecución Recomendado

Las fases 1–4 son prerequisites bloqueantes. Las fases 5–10 pueden solaparse
parcialmente una vez que la capa de datos (Fase 2) está lista.

```
Fase 1 → Fase 2 → Fase 3 → Fase 4
                               ↓
                   Fases 5–10 (en orden, con solape posible)
                               ↓
                            Fase 11
```
