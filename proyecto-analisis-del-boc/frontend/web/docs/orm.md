# ORM — Guía de Acceso a Datos

Este proyecto usa **Prisma 7** para acceder a la base de datos PostgreSQL del pipeline.

---

## Arquitectura de la conexión (Prisma 7)

A partir de Prisma 7, la conexión ya **no** se configura con `DATABASE_URL` en el
`schema.prisma`. En su lugar se usa un **driver adapter** (`@prisma/adapter-pg`) que
recibe la connection string en tiempo de ejecución:

```ts
// src/lib/db/prisma.ts
import { PrismaClient } from "../../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
export const prisma = new PrismaClient({ adapter });
```

La URL solo se necesita en dos sitios:

| Contexto | Variable | Uso |
|---|---|---|
| Ejecución (Next.js, tests) | `DATABASE_URL` en `.env` | Usado por el adapter de pg |
| CLI de Prisma (`db pull`, `generate`) | `DATABASE_URL` en `.env` vía `prisma.config.ts` | Solo operaciones de CLI |

---

## Schemas y modelos

El pipeline almacena datos en dos schemas de PostgreSQL:

```
boc_dataset   ← datos del corpus
  issue                — boletines (índice)
  issue__dispositions  — disposiciones por boletín
  document             — texto completo de cada disposición

boc_log       ← métricas de proceso
  metric_download_*    — vistas de cobertura de descarga
  metric_extraction_*  — vistas de cobertura de extracción
```

Cada modelo en `prisma/schema.prisma` declara su schema con `@@schema`:

```prisma
model Issue {
  dltId  String @id @map("_dlt_id")
  year   BigInt
  issue  BigInt
  // ...
  @@map("issue")
  @@schema("boc_dataset")
}
```

> **Nota:** las tablas del pipeline no tienen claves primarias convencionales. Prisma
> usa `_dlt_id` (clave única generada por dlt) como `@id` en cada modelo.

---

## El cliente generado

Prisma genera el cliente en `app/generated/prisma/`. El punto de entrada es `client.ts`
(no existe `index.ts`):

```ts
import { PrismaClient, Prisma } from "../../app/generated/prisma/client";
```

Desde subdirectorios (`src/lib/db/repositories/`) la ruta relativa tiene un nivel más:

```ts
import { Prisma } from "../../../../app/generated/prisma/client";
```

Para regenerar tras cambiar el schema:

```bash
npx prisma generate
```

---

## Consultas con el cliente Prisma

### Consulta básica — últimos boletines

```ts
const issues = await prisma.issue.findMany({
  orderBy: [{ year: "desc" }, { issue: "desc" }],
  take: 5,
});
```

### Consulta con relación — disposiciones de un boletín

```ts
const issue = await prisma.issue.findFirst({
  where: { year: 2024n, issue: 10n },  // BigInt (columnas bigint en BD)
  include: { dispositions: true },
});
```

> Los campos `year` e `issue` son `BigInt` en la BD. Prisma los devuelve como
> `bigint` de JavaScript. Usa `Number(row.year)` para convertirlos.

### Consulta de un documento concreto

```ts
const doc = await prisma.document.findFirst({
  where: { year: 2024n, issue: 10n, number: "3" },
});
```

---

## Consultas raw con `$queryRaw`

Las vistas de `boc_log` no tienen clave primaria y se consultan con SQL directo.
La sintaxis recomendada usa `Prisma.sql` (previene inyección SQL):

```ts
import { Prisma } from "../../../../app/generated/prisma/client";

type MetricRow = { year: bigint; total_issues: bigint; percentage: Prisma.Decimal };

const rows = await prisma.$queryRaw(
  Prisma.sql`SELECT * FROM boc_log.metric_download_issues ORDER BY year`
) as Promise<MetricRow[]>;
```

> **Importante:** las template literals de `$queryRaw` (`` $queryRaw`...` ``) no
> propagan el genérico de tipo en Prisma 7. Usa siempre la forma de función con
> `Prisma.sql` y un cast explícito.

### Full-text search con `tsquery`

La búsqueda de texto completo opera sobre dos columnas `tsvector` (no declaradas
en el schema Prisma, se usan exclusivamente en raw SQL):

| Tabla | Columna | Contenido indexado |
|---|---|---|
| `document` | `body_tsv` | Título + cuerpo completo de la disposición |
| `issue__dispositions` | `summary_tsv` | Resumen del índice del boletín |

La consulta de búsqueda hace JOIN entre ambas tablas y busca coincidencias en
cualquiera de los dos tsvectors con `OR`:

```ts
const results = await prisma.$queryRaw(Prisma.sql`
  SELECT DISTINCT ON (d.year, d.issue, CAST(d.number AS integer))
    d.year, d.issue, d.number, d.title, ...,
    CASE
      WHEN d.body_tsv @@ tsq THEN ts_headline('spanish', d.body, tsq, ...)
      WHEN id.summary_tsv @@ tsq THEN ts_headline('spanish', id.summary, tsq, ...)
    END AS excerpt
  FROM boc_dataset.document d
  JOIN boc_dataset.issue i ON i.year = d.year AND i.issue = d.issue
  LEFT JOIN boc_dataset.issue__dispositions id
    ON id._dlt_root_id = i._dlt_id AND id.disposition = CAST(d.number AS bigint)
  WHERE (d.body_tsv @@ tsq OR id.summary_tsv @@ tsq)
  ORDER BY d.year DESC, d.issue DESC, CAST(d.number AS integer) DESC
  LIMIT ${limit}
`);
```

`DISTINCT ON` evita duplicados cuando hay múltiples filas de `issue` para el
mismo (year, issue). El excerpt prioriza coincidencias en `body` sobre `summary`.

El helper `buildTsqueryFromString` (en `src/lib/search/query-builder.ts`) convierte
texto libre a una expresión `tsquery` segura:

```ts
import { buildTsqueryFromString } from "@/lib/search/query-builder";

const tsquery = buildTsqueryFromString("convocatoria beca");
// → "convocatoria:* & beca:*"
```

---

## Patrón repositorio

Ninguna página ni API route importa `prisma` directamente. Todo el acceso pasa por
los repositorios en `src/lib/db/repositories/`:

```
BulletinRepository    — findRecent(limit), findByYearAndIssue(year, issue)
DispositionRepository — search(filters, cursor, limit), findByIdentifier(year, issue, number)
MetricsRepository     — getDataQualityReport()
```

Si el pipeline cambia el nombre de una tabla o columna, **solo hay que actualizar el
repositorio afectado**. Las páginas y las API routes no necesitan cambios.

---

## Ejecutar los tests

```bash
# Todos los tests (unitarios + integración)
npm test

# Solo tests unitarios (sin BD)
npx vitest run src/__tests__/unit/

# Solo tests de integración (requieren DATABASE_URL)
npx vitest run src/__tests__/integration/

# Modo watch (durante desarrollo)
npm run test:watch
```

Los tests de integración se conectan a la BD real definida en `.env`. No usan mocks
de Prisma porque las consultas SQL (especialmente `tsquery` y `ts_headline`) no son
verificables de forma significativa sin ejecutarlas contra PostgreSQL.

Los tests unitarios de las API routes (`src/__tests__/unit/api-*.test.ts`) mockean
los repositorios y verifican el parsing de parámetros, la validación de límites y
el manejo de errores HTTP, sin necesidad de conexión a BD.
