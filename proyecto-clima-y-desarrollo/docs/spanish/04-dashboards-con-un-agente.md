# Dashboards con un agente

Cuando empezamos el slice de Metabase, el plan inicial era reproducir lo que habíamos hecho en otro proyecto: scripts en Python que tiraran POSTs a `/api/card`, `/api/dashboard` y `/api/collection` para reconstruir las tiles desde código. Es un patrón que funciona, pero es frágil — la forma del payload cambia entre versiones de Metabase, los IDs internos no son portables, y revisar un cambio en git es leer JSON enorme con campos como `visualization_settings` anidados tres niveles.

Antes de escribir una sola línea de ese código, el usuario me mandó la nota de la release de Metabase 60. La release abrió tres cosas que cambian la pregunta: un servidor MCP oficial, un comando de serialización a YAML, y una integración nativa con LLM agents. La conclusión fue rápida: **el patrón de scripts API queda obsoleto**.

Este artículo explica el flujo nuevo y por qué el cambio de ergonomía es mayor de lo que parece.

## Lo que cambia

Hasta Metabase 60 había dos formas de versionar una dashboard:

- **JSON crudo desde la API**. Un script export-import que tira de `/api/card/:id` y los parchea. El JSON es opaco, los IDs son numéricos y dependen del entorno, los snapshots ocupan miles de líneas para un dashboard pequeño.
- **`bin/metabase export`**. La serialización oficial existía pero estaba relativamente escondida en docs y, hasta versiones recientes, era una feature del plan Pro/Enterprise. La salida también era JSON.

Metabase 60 abre `bin/metabase export|import` en OSS y cambia el formato a **YAML con nombres legibles** en lugar de IDs numéricos:

```
metabase/serialized/
├── collections/
│   └── climate_dashboard/
│       ├── _collection.yaml
│       ├── pm25_vs_gdp_per_capita.yaml
│       └── air_quality_time_series.yaml
└── databases/
    └── climate-warehouse.yaml
```

Eso ya solo es un cambio cualitativo: el diff de git ahora es legible. Un PR que añade una tile cambia un fichero de ~30 líneas. Un PR que renombra una métrica cambia tres líneas. Esto importa más de lo que suena — los reviews pasan a ser posibles.

Pero la otra cosa que abrió Metabase 60 es lo que de verdad cambia el slice: un **MCP server integrado** en el binario, accesible en `https://{host}/api/mcp` con autenticación OAuth 2.0 embebida.

## Qué hace el MCP

Un agente como Claude Code, registrado contra ese endpoint, recibe siete herramientas:

- `search` — busca tablas, columnas, métricas, dashboards.
- `get_table` — devuelve el schema de una tabla, sus columnas, sus métricas asociadas.
- `get_metric` — detalle de una métrica.
- `construct_query` — construye una query estructurada (no SQL crudo, sino el formato MBQL de Metabase).
- `execute_query` — ejecuta una query y devuelve filas.
- `query` — atajo para query directa contra una tabla/métrica.
- `get_table_field_values` — distribución de valores en una columna.

Es **sólo lectura**. El agente puede explorar el modelo y ejecutar queries, pero no puede crear tiles ni dashboards desde el MCP. La creación va por el flujo de serialización: el agente escribe el YAML con la sintaxis que documenta Metabase, y `bin/metabase import` lo absorbe.

La división tiene sentido. El MCP es para **entender** el modelo (qué tablas hay, qué columnas, qué valores típicos toman). La serialización es para **modificar** el estado. Una herramienta para cada lado del problema.

## El flujo de trabajo

Quedan dos caminos equivalentes para construir las tiles del dashboard, y los dos se documentan en el README de `metabase/serialized/`:

**Path A — UI más Metabot**. El usuario abre Metabase, arrastra columnas, configura las visualizaciones a mano. Metabot (el chat de IA dentro de Metabase) ayuda a escribir SQL si hace falta. Cuando está, `make metabase-export` vuelca el estado a `metabase/serialized/`, el usuario hace `git add` y commitea.

**Path B — Claude Code más MCP**. El usuario registra el MCP server (`claude mcp add metabase http://localhost:3000/api/mcp`), opcionalmente clona el repo `metabase/agent-skills` que envuelve algunas operaciones comunes, y le pide al agente "construye las dos tiles del README desde `marts.country_year_environment`". El agente explora el modelo con las herramientas del MCP, escribe los YAML directamente en `metabase/serialized/`, hace `make metabase-import` para validar, y deja todo committable.

Los dos paths producen el mismo artefacto: un directorio de YAML versionado en git. Da igual quién lo escriba — un humano hace clicks, un agente edita ficheros — la fuente de verdad es la misma.

## Lo que decidimos no hacer

Tres tentaciones que rechacé:

**1. No escribir scripts API de creación de tiles.** El equivalente al patrón viejo (Python con `requests` que hace POSTs a `/api/card`). Lo descartamos porque la serialización ya cubre el caso y mantenerla escala mejor que mantener scripts.

**2. No automatizar la construcción del dashboard en el smoke test.** El smoke test verifica que Metabase arranca, que el bootstrap creó el admin y la fuente de datos, que `/api/health` responde. **No verifica que las tiles existan**. La razón es honesta: no las construyo automáticamente; las construye un humano (o un agente) cuando dedica tiempo a hacerlo. El smoke test no debe mentir: dice lo que sí ha sido validado, no lo que aspiraría a estar.

**3. No usar Metabot Slack ni "BYO model" en este proyecto.** Son features de Metabase 60 que permiten que end-users del dashboard hablen con un LLM dentro de Metabase. Útil para producción, irrelevante para un proyecto que no tiene end-users no técnicos. La decisión es de scope.

## La parte meta

El cambio de patrón —de "scripts que generan dashboards" a "agente que edita YAML versionado"— es parte de una tendencia más grande en herramientas de datos. Lo mismo está empezando a pasar con dbt (los `agent-skills` para crear modelos), con Terraform (Claude Code escribe HCL revisable), con notebooks (los Jupyter MCPs).

La generación previa de herramientas de productividad asumía que la única forma de automatizar era una API. La generación nueva asume que la API existe, pero que el formato canónico de almacenamiento es **un fichero legible que un humano y un agente pueden editar indistintamente**. La API se usa para validar el fichero (es decir, importarlo y comprobar que el sistema lo acepta), no para construirlo.

Es una arquitectura más simple y más auditable. Lo escribo para acordarme: **antes de empezar a escribir un cliente API de cero, comprueba si el sistema tiene un formato de serialización legible y un endpoint de import**. Si lo tiene, la integración pasa de ser cientos de líneas de Python a ser un make target de cinco.
