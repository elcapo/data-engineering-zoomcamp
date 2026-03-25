# BOC Canarias Web

Interfaz de consulta del Boletín Oficial de Canarias (BOC). Ofrece búsqueda de texto completo con operadores booleanos, filtros combinados, métricas de cobertura y navegación por el archivo histórico desde 1980.

Iniciativa independiente. La autoría de los contenidos publicados pertenece al Gobierno de Canarias.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js (App Router, SSR/SSG) |
| UI | React + Tailwind CSS |
| ORM | Prisma (PostgreSQL) |
| Full-text search | PostgreSQL `tsvector` + `tsquery` (español) |
| Gráficas | Recharts |
| Despliegue | Docker / Traefik |

---

## Arquitectura

```
app/  (Next.js App Router)
├── page.tsx                          /
├── buscar/page.tsx                   /buscar
├── metricas/page.tsx                 /metricas
├── disposicion/[year]/[issue]/[number]/page.tsx
├── {metodologia,aviso-legal,sobre-el-proyecto}/page.tsx
└── api/
    ├── search/route.ts
    ├── bulletins/route.ts
    └── metrics/route.ts

src/
├── components/
│   ├── ui/           Card, Badge, Button, Spinner, MetricBar
│   ├── layout/       Header (con SearchBar), Footer, Nav
│   ├── bulletin/     BulletinCard, DispositionCard, EditorialCard, SectionBreadcrumb
│   ├── search/       SearchBar, FilterPanel, BooleanTermInput, DateRangePicker, SemanticPaginator
│   ├── metrics/      BarChart (Recharts), MetricKPI
│   └── MarkdownPage
├── lib/
│   ├── db/
│   │   ├── prisma.ts              cliente Prisma singleton
│   │   └── repositories/          BulletinRepository, DispositionRepository, MetricsRepository
│   ├── search/query-builder.ts    convierte filtros UI a tsquery
│   └── content/markdown.ts        lee content/ en tiempo de servidor
└── types/domain.ts                Bulletin, Disposition, DataQualityReport

content/           contenidos editoriales en Markdown (no requieren BD)
├── home/
│   ├── sections.yaml              define bloques y orden de la home
│   └── featured/                  artículos destacados
└── pages/
    ├── aviso-legal.md
    ├── metodologia.md
    └── sobre-el-proyecto.md

prisma/
└── schema.prisma                  modelos mapeados sobre boc_dataset + boc_log
```

Las páginas y API routes nunca acceden a la BD directamente: siempre pasan por los repositorios, que mapean el esquema del pipeline a entidades de dominio propias (`Bulletin`, `Disposition`, `DataQualityReport`).

---

## Componentes

Los componentes de `src/components/` están organizados por dominio:

| Directorio | Componentes | Propósito |
|---|---|---|
| `ui/` | Card, Badge, Button, Spinner, MetricBar | Primitivas de UI reutilizables |
| `layout/` | Header, Footer, Nav | Estructura de la app (Header incluye SearchBar) |
| `bulletin/` | BulletinCard, DispositionCard, EditorialCard, SectionBreadcrumb | Tarjetas de boletines y disposiciones |
| `search/` | SearchBar, FilterPanel, BooleanTermInput, DateRangePicker, SemanticPaginator | UI de búsqueda y filtros |
| `metrics/` | BarChart, MetricKPI | Visualización de métricas (BarChart envuelve Recharts) |
| raíz | MarkdownPage | Renderiza páginas Markdown con estilos `prose` |

Los componentes con estado del cliente (`"use client"`) son: SearchBar, BooleanTermInput, DateRangePicker, FilterPanel y BarChart. El resto son server-compatible.

---

## API

Todas las rutas son `GET` y devuelven JSON.

| Endpoint | Parámetros | Respuesta |
|---|---|---|
| `/api/bulletins` | `limit` (1–50, default 5) | `Bulletin[]` |
| `/api/search` | `q`, `section[]`, `subsection[]`, `org`, `from`, `to`, `year`, `issue`, `cursor`, `limit` (1–100, default 20) | `{ results, total, nextCursor, prevCursor }` |
| `/api/metrics` | — | `DataQualityReport` |

Las rutas son capas finas sobre los repositorios: parsean query params, delegan en el repositorio correspondiente y devuelven el resultado. Los errores internos producen un 500 con `{ error: "..." }`.

---

## Contenidos Estáticos

Los contenidos editoriales se gestionan en ficheros Markdown y YAML dentro de `content/`, sin necesidad de BD ni CMS:

| Fichero | Propósito |
|---|---|
| `content/home/sections.yaml` | Define los bloques y su orden en la página de inicio |
| `content/home/featured/` | Artículos destacados (Markdown con frontmatter) |
| `content/pages/aviso-legal.md` | Aviso legal |
| `content/pages/metodologia.md` | Metodología y fuentes |
| `content/pages/sobre-el-proyecto.md` | Descripción de la iniciativa |

La utilidad `src/lib/content/markdown.ts` expone:
- `readMarkdownPage(slug)` — lee una página de `content/pages/`, parsea frontmatter y convierte a HTML.
- `readFeaturedArticles(source)` — lee artículos de `content/home/<source>/`, ordenados por `order`.
- `readSectionsConfig()` — lee `content/home/sections.yaml`.
- `listPageSlugs()` — lista los slugs disponibles en `content/pages/`.

Agregar o modificar páginas estáticas solo requiere editar los ficheros Markdown.

---

## Páginas

| Ruta | Estado | Descripción |
|---|---|---|
| `/` | Implementada | Home: bloques configurables via `sections.yaml` (últimos boletines + editorial) |
| `/buscar` | Implementada | Búsqueda full-text con filtros combinados |
| `/metricas` | Implementada | Métricas de cobertura del corpus |
| `/disposicion/[year]/[issue]/[number]` | Pendiente | Detalle de disposición individual |
| `/metodologia` | Pendiente | Página estática desde Markdown |
| `/aviso-legal` | Pendiente | Página estática desde Markdown |
| `/sobre-el-proyecto` | Pendiente | Página estática desde Markdown |

La home (`/`) es un Server Component que lee `sections.yaml`, renderiza cada bloque dinámicamente y obtiene datos del servidor (boletines recientes desde BD, artículos editoriales desde ficheros Markdown).

---

## Base de Datos

El proyecto se conecta a la BD del pipeline (`boc_dataset` + `boc_log`) como cliente de solo lectura. No gestiona migraciones sobre esos esquemas.

Tablas y vistas utilizadas:

| Entidad de dominio | Fuente en BD |
|---|---|
| `Bulletin` | `boc_dataset.issue` |
| `Disposition` | `boc_dataset.issue__dispositions` + `boc_dataset.document` |
| `DataQualityReport` | vistas `boc_log.metric_*` |

---

## Desarrollo Local

### Requisitos

- Node.js 20+
- Acceso a la BD PostgreSQL del pipeline

### Configuración

```bash
cp .env.example .env
# edita .env con los datos de conexión reales
```

Variables necesarias en `.env`:

```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/boc
```

### Arrancar

```bash
npm install
npx prisma generate
npm run dev
```

La app estará disponible en `http://localhost:3000`.

---

## Tests

```bash
# Todos los tests (unitarios + integración)
npm test

# Solo unitarios (sin BD)
npx vitest run src/__tests__/unit/

# Solo integración (requiere DATABASE_URL)
npx vitest run src/__tests__/integration/
```

Los tests unitarios mockean los repositorios y verifican parsing de parámetros, validación de límites y manejo de errores en las API routes. Los tests de integración se conectan a la BD real para verificar las consultas SQL (incluyendo `tsquery` y `ts_headline`).

---

## Despliegue con Docker

El servicio `boc-web` se conecta a la red externa `boc-postgres-network` (la misma que usa el servicio de BD del pipeline).

### Configuración

Las variables de entorno se pasan como variables individuales y el `docker-compose.yml` construye `DATABASE_URL` internamente:

```
POSTGRES_HOST=<host>
POSTGRES_PORT=5432
POSTGRES_DB=boc
POSTGRES_USER=<user>
POSTGRES_PASSWORD=<password>
```

### Arrancar (acceso por puerto)

```bash
docker compose -f docker-compose.yml -f docker-compose.port.yml up -d
```

### Arrancar (detrás de Traefik)

```bash
BOC_WEB_DOMAIN=boc.example.com \
docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d
```
