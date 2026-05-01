# Documentación

Documentación del proyecto **clima y desarrollo**: una serie de artículos cortos que explican las decisiones de diseño no obvias del pipeline.

La serie está pensada para alguien que ya leyó el README principal y se pregunta *por qué* hicimos algo de cierta manera, no *cómo* funciona.

## Artículos

Los artículos viven en `docs/spanish/` (texto original) y `docs/english/` (traducción, llega cuando los originales estén validados).

| # | Título | Tema |
|---|---|---|
| 01 | [Local y nube con el mismo código](spanish/01-arquitectura-dual-backend.md) | Por qué el pipeline corre idéntico en Docker y en GCP — y qué disciplina hace falta para evitar las ramas `if cloud`. |
| 02 | [Streaming y batch en el mismo warehouse](spanish/02-streaming-y-batch-en-el-mismo-warehouse.md) | Cómo Flink y Spark escriben a la misma tabla sin pisarse, y por qué la PK + `ON CONFLICT DO NOTHING` es suficiente. |
| 03 | [El dump de S3 vs la API en vivo](spanish/03-dump-s3-vs-api-en-vivo.md) | El backfill histórico de OpenAQ tira del archivo S3 público; el polling vivo tira de la API. Cuándo cuál y por qué. |
| 04 | [Dashboards con un agente](spanish/04-dashboards-con-un-agente.md) | Metabase 60 trajo un MCP server oficial. Lo que cambia respecto al patrón "scripts que llaman a la API". |

## Recursos

- [`resources/charts/architecture.png`](resources/charts/architecture.png) — versión prerenderizada del diagrama Mermaid del README principal. Generar con `make render-architecture-diagram` (requiere Docker).
