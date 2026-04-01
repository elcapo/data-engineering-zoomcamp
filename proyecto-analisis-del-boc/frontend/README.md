# Bocana — Especificación Técnica

## Visión del Proyecto

Bocana es una interfaz moderna e independiente para consultar el Boletín Oficial de Canarias (BOC). El proyecto nace para ofrecer herramientas de búsqueda y navegación que no existen en la web oficial: búsqueda de texto completo con operadores booleanos, filtros combinados, métricas de cobertura y un punto de entrada editorial curado.

**Audiencia principal:** abogados, ciudadanía que busca convocatorias públicas, periodistas e investigadores.

**Principios de diseño:**
- Moderno, limpio y accesible — sin inspiración estética en la web oficial del BOC.
- Iniciativa independiente: la autoría de los contenidos publicados pertenece al Gobierno de Canarias; este proyecto es un servicio de consulta derivado.
- Interfaces modulares que permitan evolucionar el contenido sin cambios de código.

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React + Tailwind CSS |
| ORM | Prisma (PostgreSQL) |
| Acceso a datos | API Routes de Next.js (no se expone Postgres directamente al cliente) |
| Contenidos estáticos | Ficheros Markdown en `content/` procesados con `gray-matter` + `remark` |
| Full-text search | PostgreSQL `tsvector` + `tsquery` (configuración española) |
| Gráficas | Recharts o Visx |
| Despliegue | Docker / compatible con Traefik (siguiendo patrón del directorio `postgres/`) |

## Arquitectura

### Capas

```
┌─────────────────────────────────────────┐
│           Next.js (App Router)          │
│  ┌──────────┐  ┌────────────────────┐   │
│  │  Pages   │  │   API Routes       │   │
│  │ (RSC/SSR)│  │ /api/search        │   │
│  │          │  │ /api/bulletins     │   │
│  │          │  │ /api/metrics       │   │
│  └────┬─────┘  └────────┬───────────┘   │
│       │                 │               │
│  ┌────▼──────────────────▼───────────┐  │
│  │         Repository Layer          │  │
│  │  BulletinRepository               │  │
│  │  DispositionRepository            │  │
│  │  MetricsRepository                │  │
│  └────────────────┬──────────────────┘  │
│                   │                     │
│  ┌────────────────▼──────────────────┐  │
│  │         Prisma ORM                │  │
│  └────────────────┬──────────────────┘  │
└───────────────────┼─────────────────────┘
                    │
            PostgreSQL (boc_dataset + boc_log)
```

### Principio de desacoplamiento

La web **no usa los nombres de tabla del pipeline directamente** en el código de UI. Los repositorios mapean el esquema de BD a entidades de dominio propias:

| Entidad Web | Fuente en BD |
|---|---|
| `Bulletin` | `boc_dataset.issue` |
| `Disposition` | `boc_dataset.issue__dispositions` + `boc_dataset.document` |
| `DataQualityReport` | Vistas `boc_log.metric_*` |

Si el pipeline cambia su esquema, solo hay que actualizar los repositorios.

### Gestión de Contenidos Estáticos

Los contenidos editoriales (artículos destacados, bloques de la home, aviso legal, metodología) se almacenan en `content/` como ficheros Markdown con frontmatter YAML:

```
content/
  home/
    featured/          ← artículos destacados (order, title, excerpt, link)
    sections.yaml      ← configuración de secciones de la home
  pages/
    aviso-legal.md
    metodologia.md
    sobre-el-proyecto.md
```

Next.js lee estos ficheros en tiempo de build (SSG) o en tiempo de servidor. No se necesita CMS externo.

## Modelo de Dominio Web

### `Bulletin` (Boletín)

```typescript
interface Bulletin {
  year: number;
  issue: number;
  title: string;          // "BOC Nº 1 - Lunes 2 de enero de 2026"
  date: string;           // derivado del título
  url: string;            // enlace al HTML oficial
  summaryPdfUrl: string;  // PDF resumen oficial
  dispositionCount: number;
}
```

### `Disposition` (Disposición)

```typescript
interface Disposition {
  year: number;
  issue: number;
  number: string;
  section: string;
  subsection?: string;
  organization: string;
  title: string;
  date: string;
  identifier?: string;   // código CVE (disposiciones modernas)
  pdfUrl: string;
  htmlUrl?: string;
  body?: string;         // Markdown con el texto completo
  excerpt?: string;      // fragmento con coincidencias resaltadas (en búsquedas)
}
```

### `DataQualityReport` (Métricas)

```typescript
interface DataQualityReport {
  downloads: {
    years: { total: number; downloaded: number; percentage: number };
    issues: YearBreakdown[];
    documents: IssueBreakdown[];
  };
  extractions: {
    years: { total: number; extracted: number; percentage: number };
    issues: YearBreakdown[];
    documents: IssueBreakdown[];
  };
}
```

## Páginas

### Página de Inicio (`/`)

**Propósito:** punto de entrada editorial. Combina contenido curado manualmente con un resumen automático de los boletines más recientes.

**Estructura de la página (modular via `content/home/sections.yaml`):**

```
┌─────────────────────────────────────────┐
│  Header + Barra de búsqueda rápida      │
├─────────────────────────────────────────┤
│  Bloque: Últimos boletines              │  ← automático (últimos 5 boletines)
│  [Boletín card] [Boletín card] ...      │
├─────────────────────────────────────────┤
│  Bloque: Destacados editoriales         │  ← manual (Markdown en content/home/)
│  [Artículo card] [Búsqueda guardada]    │
├─────────────────────────────────────────┤
│  Bloque: [configurable]                 │  ← puede ser otro bloque arbitrario
└─────────────────────────────────────────┘
```

**Comportamiento:**
- Los bloques y su orden se definen en `content/home/sections.yaml`.
- Cada bloque tiene un `type`: `latest-bulletins` (automático) o `editorial` (Markdown).
- El bloque `latest-bulletins` muestra para cada boletín: fecha, número, y un resumen de sus secciones con conteo de disposiciones por sección.
- Agregar o reordenar bloques no requiere cambios de código.

**Componentes clave:**
- `<BulletinCard>` — miniatura de un boletín con fecha, número y resumen de secciones.
- `<DispositionCard>` — tarjeta de disposición individual (reutilizada en búsqueda).
- `<EditorialCard>` — artículo curado con título, extracto y enlace.
- `<SearchBar>` — barra de búsqueda rápida que redirige a `/buscar`.

### Búsqueda (`/buscar`)

**Propósito:** encontrar disposiciones usando texto libre y filtros combinados.

#### Panel de Filtros

| Filtro | Tipo | Notas |
|---|---|---|
| Texto (full-text) | Input con operadores | Ver abajo |
| Sección | Select múltiple | Valores de `boc_dataset.document.section` |
| Subsección | Select múltiple | Dependiente de sección seleccionada |
| Organización | Autocomplete | Valores de `organization` |
| Rango de fechas | Date range picker | Sobre `document.date` |
| Año | Select | Rango 1982–presente |
| Boletín (issue) | Numérico | Opcional |

#### Búsqueda Full-Text con Operadores Booleanos

La interfaz permite componer expresiones booleanas mediante una UI de "chips":

- **Contiene:** término añadido como chip verde → `tsquery: 'término'`
- **No contiene:** chip rojo → `tsquery: !término`
- **O:** dos chips del mismo color separados con `|` → `tsquery: 'a' | 'b'`

Ejemplo visual:
```
[ convocatoria ✕ ]  [ beca ✕ ]  OR  [ universidad ✗ excluir ]
```

Esto genera internamente: `tsquery: (convocatoria | beca) & !universidad`

La ejecución se hace contra la columna `document.body_tsv` (índice GIN, configuración `spanish`).

#### Vista de Resultados

**Componente superior:** gráfica de barras temporal mostrando el número de resultados por año (o por boletín si el rango es corto). Permite ver en qué períodos ha habido más actividad sobre los términos buscados.

**Lista de resultados:** tarjetas `<DispositionCard>` con:
- Encabezado: sección > subsección > organización
- Título de la disposición
- Fecha y número de boletín
- Párrafos relevantes con coincidencias resaltadas (`<mark>`)
- Enlace al PDF oficial y a la página de detalle

#### Paginación Semántica

En lugar de "Página 1 / 2 / 3", la paginación muestra la posición en el corpus:

```
← Anterior    Año 2024, Boletín 45, Disposiciones 10–20    Siguiente →
```

O para resultados más amplios:
```
← Año 2023    [2024]    Año 2025 →
```

La URL refleja el cursor: `/buscar?q=convocatoria&cursor=2024-045-010`

#### API Route

`GET /api/search`

```
Parámetros:
  q         string   expresión de búsqueda libre
  section   string[] secciones (múltiple)
  subsection string[]
  org       string   organización
  from      string   fecha inicio (YYYY-MM-DD)
  to        string   fecha fin (YYYY-MM-DD)
  year      number
  issue     number
  cursor    string   paginación semántica (year-issue-disposition)
  limit     number   por defecto 20
```

### Métricas de Completitud (`/metricas`)

**Propósito:** mostrar de forma transparente qué porcentaje del corpus histórico del BOC está disponible en la base de datos.

**Secciones de la página:**

#### Resumen General (tarjetas KPI)
- % de años con índice descargado
- % de boletines descargados
- % de disposiciones con texto completo extraído

#### Progreso por Año (gráfica de barras horizontales)
- Eje Y: año (1980–presente)
- Eje X: porcentaje de boletines descargados ese año
- Color: verde (≥95%), amarillo (50–95%), rojo (<50%)
- Al hacer clic en un año: expande una tabla con el detalle por boletín

#### Progreso de Extracción vs Descarga
- Gráfica comparativa: barras agrupadas por año (descargado vs extraído)

**Fuente de datos:** vistas `boc_log.metric_download_*` y `boc_log.metric_extraction_*`

**API Route:** `GET /api/metrics` — devuelve un `DataQualityReport` completo.

**Nota:** la página es pública pero orientada a usuarios técnicos o interesados en la metodología. Debe incluir un enlace a `/metodologia`.

### Metodología y Fuentes (`/metodologia`)

**Propósito:** explicar de dónde vienen los datos, cómo se procesan y cuáles son sus limitaciones.

**Contenido gestionado en:** `content/pages/metodologia.md`

**Secciones sugeridas (ver borrador en Sección 7):**
1. Fuente de datos
2. Proceso de obtención
3. Cobertura histórica y limitaciones
4. Licencia y atribución
5. Contacto / Repositorio

### Páginas Estáticas

| Ruta | Fichero fuente | Descripción |
|---|---|---|
| `/aviso-legal` | `content/pages/aviso-legal.md` | Términos legales, autoría y licencia |
| `/metodologia` | `content/pages/metodologia.md` | Fuentes y metodología |
| `/sobre-el-proyecto` | `content/pages/sobre-el-proyecto.md` | Descripción de la iniciativa |

Todas se renderizan con SSG en tiempo de build y no requieren acceso a BD.

## Componentes Reutilizables

| Componente | Descripción |
|---|---|
| `<BulletinCard>` | Tarjeta de boletín: fecha, número, resumen de secciones |
| `<DispositionCard>` | Tarjeta de disposición con metadatos y extracto |
| `<EditorialCard>` | Artículo curado (título, extracto, enlace) |
| `<SearchBar>` | Input de búsqueda rápida |
| `<FilterPanel>` | Panel lateral con todos los filtros de búsqueda |
| `<BooleanTermInput>` | Input de términos con chips booleanos (contiene / excluye / OR) |
| `<DateRangePicker>` | Selector de rango de fechas |
| `<MetricBar>` | Barra de progreso con color semafórico |
| `<BarChart>` | Gráfica de barras (resultados por año / métricas) |
| `<SemanticPaginator>` | Paginador con posición semántica en el corpus |
| `<MarkdownPage>` | Renderizador de página desde fichero Markdown |
| `<SectionBreadcrumb>` | Sección > Subsección > Organización |

## Borradores de Contenido Editorial

### Aviso Legal (`content/pages/aviso-legal.md`)

```markdown
---
title: Aviso Legal
---

## Autoría y Derechos

Los textos publicados en el Boletín Oficial de Canarias (BOC) son de autoría
del Gobierno de Canarias y sus organismos. De acuerdo con las condiciones
establecidas por el propio Gobierno de Canarias:

> Se autoriza su reproducción siempre que se cite la fuente, salvo que se
> indique lo contrario.

Este proyecto reproduce, indexa y facilita el acceso a dichos textos con la
correspondiente cita de la fuente oficial: **Boletín Oficial de Canarias,
Gobierno de Canarias** ([www.gobiernodecanarias.org/boc](https://www.gobiernodecanarias.org/boc)).

## Sobre Este Servicio

Bocana es una **iniciativa independiente** no vinculada al Gobierno
de Canarias ni a ningún organismo público. El servicio se ofrece con fines
informativos y de acceso a la información pública.

Los textos originales están sujetos a las condiciones de reproducción del
Gobierno de Canarias. El código fuente de esta plataforma está disponible
bajo licencia [MIT / Apache 2.0 — por definir].

## Exactitud de la Información

Aunque se hacen todos los esfuerzos para mantener la información actualizada
y correcta, este servicio no garantiza la exactitud, integridad ni vigencia
de los contenidos. En caso de discrepancia, prevalece el texto publicado en
la sede electrónica oficial del BOC.

## Responsabilidad

El uso de la información proporcionada por este servicio es responsabilidad
del usuario. No nos hacemos responsables de decisiones tomadas sobre la base
de los contenidos aquí publicados.

## Contacto

Para cualquier consulta, error o sugerencia: [formulario / email por definir].
```

### Metodología y Fuentes (`content/pages/metodologia.md`)

```markdown
---
title: Metodología y Fuentes
---

## Fuente de Datos

Los datos provienen del **Boletín Oficial de Canarias (BOC)**, publicación
oficial del Gobierno de Canarias disponible en
[www.gobiernodecanarias.org/boc](https://www.gobiernodecanarias.org/boc).

La autoría de todos los textos publicados corresponde al Gobierno de Canarias
y a los organismos emisores de cada disposición. Este proyecto los reproduce
citando la fuente conforme a las condiciones de reproducción establecidas.

## Proceso de Obtención

La plataforma obtiene los datos mediante un proceso automatizado que:

1. **Descarga** los índices del BOC (archivo histórico, años, boletines y
   disposiciones individuales) desde la web oficial en formato HTML.
2. **Extrae** los metadatos y el texto completo de cada disposición,
   preservando la estructura original.
3. **Almacena** los textos en una base de datos con índices de búsqueda de
   texto completo en español.

El proceso respeta los tiempos de respuesta del servidor oficial y no genera
carga significativa sobre la infraestructura del Gobierno de Canarias.

## Cobertura Histórica

El BOC publica en su web el archivo completo desde **1980** hasta la
actualidad. Esta plataforma aspira a indexar la totalidad del archivo
histórico disponible.

La página de [métricas](/metricas) muestra en tiempo real el porcentaje del
corpus histórico que está actualmente disponible en la base de datos,
desglosado por año y boletín.

## Limitaciones Conocidas

- Los boletines más antiguos (anteriores a cierto año) pueden presentar una
  estructura HTML diferente que limita la extracción del texto completo.
- Las imágenes, tablas complejas y anexos en formato PDF no son
  actualmente indexados.
- El proceso de actualización no es en tiempo real. Puede haber un desfase
  de horas o días respecto a la publicación oficial.

## Tecnología

- **Base de datos:** PostgreSQL con búsqueda de texto completo (`tsvector`)
  en configuración lingüística española.
- **Código fuente:** disponible en [repositorio por definir] bajo licencia
  de código abierto.

## Contacto

Para reportar errores en los datos o en la extracción, o para sugerencias:
[formulario / email por definir].
```

## Consideraciones de SEO

- Las páginas de disposiciones individuales (`/disposicion/[year]/[issue]/[number]`) son SSR para permitir indexación.
- `<title>` y `<meta description>` se generan dinámicamente desde el título y extracto de cada disposición.
- Sitemap XML automático via `next-sitemap` (excluyendo resultados de búsqueda).
- URLs legibles: `/buscar?q=convocatoria&section=I` en lugar de IDs opacos.

---

## Estructura de Directorios del Proyecto

```
frontend/
├── src/
│   ├── app/                        ← Next.js App Router
│   │   ├── page.tsx                ← Inicio
│   │   ├── buscar/page.tsx         ← Búsqueda
│   │   ├── metricas/page.tsx       ← Métricas
│   │   ├── metodologia/page.tsx    ← Metodología (desde Markdown)
│   │   ├── aviso-legal/page.tsx    ← Aviso legal (desde Markdown)
│   │   ├── sobre-el-proyecto/page.tsx
│   │   ├── disposicion/
│   │   │   └── [year]/[issue]/[number]/page.tsx
│   │   └── api/
│   │       ├── search/route.ts
│   │       ├── bulletins/route.ts
│   │       └── metrics/route.ts
│   ├── components/                 ← Componentes reutilizables
│   │   ├── ui/                     ← Componentes genéricos (Button, Card, etc.)
│   │   ├── search/                 ← Panel de búsqueda y filtros
│   │   ├── bulletin/               ← Tarjetas de boletín y disposición
│   │   ├── metrics/                ← Gráficas y métricas
│   │   └── layout/                 ← Header, Footer, Nav
│   ├── lib/
│   │   ├── db/
│   │   │   ├── prisma.ts           ← Cliente Prisma singleton
│   │   │   └── repositories/
│   │   │       ├── bulletins.ts
│   │   │       ├── dispositions.ts
│   │   │       └── metrics.ts
│   │   ├── search/
│   │   │   └── query-builder.ts    ← Construye tsquery desde filtros UI
│   │   └── content/
│   │       └── markdown.ts         ← Lee ficheros Markdown de content/
│   └── types/
│       └── domain.ts               ← Tipos de dominio (Bulletin, Disposition, etc.)
├── content/                        ← Contenidos editoriales en Markdown
│   ├── home/
│   │   ├── sections.yaml
│   │   └── featured/
│   └── pages/
│       ├── aviso-legal.md
│       ├── metodologia.md
│       └── sobre-el-proyecto.md
├── prisma/
│   └── schema.prisma               ← Esquema Prisma mapeando boc_dataset + boc_log
├── public/
└── postgres/                       ← Config PostgreSQL existente (no modificar)
```
