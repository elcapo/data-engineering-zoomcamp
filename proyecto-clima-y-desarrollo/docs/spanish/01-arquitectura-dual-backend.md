# Local y nube con el mismo código

El proyecto corre de extremo a extremo de dos formas: con `docker compose up` en una máquina y con `terraform apply` en GCP. Lo curioso no es que existan los dos modos —eso es lo que prometen casi todas las plataformas modernas—, sino que **el código es literalmente el mismo**. No hay ramas `if cloud else local`, no hay forks de los scripts, no hay versiones cloud-only de los modelos dbt. Sólo hay un puñado de variables de entorno que apuntan a sitios distintos.

Este artículo explica por qué decidimos pagar el coste de mantener esa simetría desde el día uno y qué disciplina exige.

## Por qué importa

La razón principal es práctica: **no hay dos pipelines para mantener**. Si arreglo un bug en la lógica de reconciliación ISO2 → ISO3, lo arreglo una vez, no en `producer/openaq/` y luego otra vez en `producer/openaq-cloud/`. Si añado un test al modelo dbt, ese test corre tanto contra Postgres como contra BigQuery. Si me equivoco con un nombre de columna, lo veo en local en cinco segundos antes de tocar la nube.

La razón secundaria es de aprendizaje: forzarme a hacer abstracciones que funcionan en ambos sitios me obliga a entender qué tienen en común los dos backends. Resulta que no son tan distintos como parece.

## Las tres abstracciones

Los servicios del pipeline se hablan a través de tres interfaces. Para cada una elegí algo que ambos lados pudieran implementar:

### Almacenamiento de objetos

Tanto MinIO (local) como GCS exponen una API compatible con S3. Todo el código usa `boto3` contra una URL que viene de `STORAGE_ENDPOINT`. En local apunta a `http://minio:9000`, en cloud no se setea (boto3 cae a la URL pública de AWS, pero con un endpoint resolver custom apuntamos a `https://storage.googleapis.com`).

```python
client = boto3.client(
    "s3",
    endpoint_url=os.getenv("STORAGE_ENDPOINT"),
    aws_access_key_id=os.getenv("STORAGE_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("STORAGE_SECRET_KEY"),
    region_name=os.getenv("STORAGE_REGION", "us-east-1"),
)
```

El productor del World Bank y el job Spark leen y escriben con este cliente sin saber dónde están los bytes. El bucket se llama igual en los dos modos (`climate` por defecto), así que las rutas tampoco cambian.

### Data warehouse

dbt tiene adaptadores para Postgres y BigQuery. El `profiles.yml` define los dos targets:

```yaml
climate:
  target: "{{ env_var('WAREHOUSE_BACKEND', 'postgres') }}"
  outputs:
    postgres: { type: postgres, ... }
    bigquery: { type: bigquery, ... }
```

Los modelos en `dbt/models/` son SQL agnóstico al motor en un 95% — `select`, `with`, `group by`, `case when`. El 5% que diverge (sintaxis de partition / cluster, cálculo de mediana) lo encapsulan dos macros adapter-aware:

```sql
{% macro median(expr) %}
    {%- if target.type == 'bigquery' -%}
        approx_quantiles({{ expr }}, 100)[offset(50)]
    {%- else -%}
        percentile_cont(0.5) within group (order by {{ expr }})
    {%- endif -%}
{% endmacro %}
```

Una macro, dos implementaciones, llamada idéntica desde los modelos. No hay un `model.bigquery.sql` y un `model.postgres.sql`.

### Stream broker

Redpanda habla el protocolo Kafka idéntico tanto si corre en un contenedor como si corre en una VM de GCE. El productor de OpenAQ y el job PyFlink usan `kafka-python-ng` y la API de Flink-Kafka respectivamente; en ningún caso saben si Redpanda está en `redpanda:9092` o en `10.10.0.5:9092`. La variable `KAFKA_BOOTSTRAP_SERVERS` cambia, el código no.

## La disciplina que exige

Mantener la simetría no es gratis. Hay tres reglas que aplico sin excepción:

**1. Variables de entorno como única fuente de configuración.** Nada de leer un YAML que tiene un campo `cloud:` y otro `local:`. Todo lo que cambia entre modos es una variable, y `env.template` documenta las dos columnas:

| Variable | Local | Cloud |
|---|---|---|
| `STORAGE_BACKEND` | `minio` | `gcs` |
| `STORAGE_ENDPOINT` | `http://minio:9000` | `https://storage.googleapis.com` |
| `WAREHOUSE_BACKEND` | `postgres` | `bigquery` |

Si un componente necesita comportarse distinto, ese comportamiento se expresa en una variable, no en un `if`.

**2. Las macros adapter-aware viven en `macros/`, no en los modelos.** Cuando me cruzo con una divergencia de sintaxis (la sintaxis de `partition by` de BigQuery vs `partition by range` de Postgres), la decisión de "hago una macro o un `{% if target.type %}` inline" siempre es **macro**. Los modelos quedan limpios, las macros llevan toda la fealdad concentrada en un sitio fácil de auditar.

**3. Los smoke tests corren en local.** Cada slice tiene un `make smoke-test-X` que verifica el end-to-end **sin tocar la nube**. La nube se valida con `make smoke-test-terraform` (sólo `terraform validate`, no `apply`). Esto suena a evasión, pero es lo correcto: si los smoke tests pasan en local con Postgres, BigQuery va a pasar también, porque la lógica de negocio no cambia entre engines. Lo que sí cambiaría —credenciales mal seteadas, IAM roto, costes inesperados— se valida con la apply real, no con un test automático.

## Lo que no entra en la simetría

Tres componentes son específicos de un solo modo:

- **Spark batch**: en local corre en un contenedor Bitnami, en cloud en Dataproc Serverless. El `spark-submit` es el mismo, los flags difieren. La separación está en el orquestador (Kestra), no en el job.
- **Metabase ↔ Looker Studio**: la dashboard es local-only en Metabase porque Looker Studio no se Terraforma. El YAML serializado de Metabase es la fuente de verdad; Looker se reconstruye a mano sobre el mismo `marts.country_year_environment`.
- **Postgres interno de Metabase**: en cloud no existe (Metabase no corre en cloud, Looker sí).

Estas asimetrías están documentadas y aceptadas. La regla no es "todo idéntico", la regla es "nada divergente sin un motivo escrito".

## Lo que esto deja claro

Cuando el modo cloud y el modo local convergen, el modo cloud deja de ser una caja negra. Cada cosa que veo en GCS la entiendo porque la vi pasar antes en MinIO. Cada query de BigQuery la depuro localmente en Postgres. Esto invierte la dinámica habitual donde "en mi máquina funciona y en la nube no". Aquí, si funciona en mi máquina, funciona en la nube **por construcción**, no por suerte.

El precio: pensar dos veces cada decisión de schema o sintaxis, y rechazar las features que sólo existen en un engine. He cedido en algunas cosas (no uso Postgres `LATERAL`, no uso BigQuery `ARRAYS`) pero el balance sale rentable: el día que toca migrar, no migro nada — sólo cambio variables de entorno.
