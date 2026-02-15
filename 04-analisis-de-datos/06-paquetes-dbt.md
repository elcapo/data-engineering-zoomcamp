# Análisis de datos

## Paquetes **dbt**

* Vídeo original (en español): [dbt Packages](https://www.youtube.com/watch?v=KfhUA9Kfp8Y)

Además de la posibilidad de extender **dbt** implementando nuestras propias macros, existe también la posibilidad de extenderlo usando paquetes creados por la comunidad. Las más importantes podemos encontrarlas en [hub.getdbt.com](https://hub.getdbt.com).

## Instalación

Para instalar un paquete, tenemos que añadirlo a nuestro [packages.yml](pipeline/nytaxi/packages.yml):

```yaml
packages:
  - package: dbt-labs/dbt_utils
    version: [">=1.3.3", "<2.0.0"]
  - package: dbt-labs/codegen
    version: [">=0.14.0", "<1.0.0"]
```

Y luego lanzar:

```bash
uv run dbt deps
```

```
11:45:49  Running with dbt=1.11.4
11:45:50  Updating lock file in file path: /pipeline/nytaxi/package-lock.yml
11:45:50  Installing dbt-labs/dbt_utils
11:45:51  Installed from version 1.3.3
11:45:51  Up to date!
11:45:51  Installing dbt-labs/codegen
11:45:51  Installed from version 0.14.0
11:45:51  Up to date!
```

## Paquetes destacados

### `dbt_utils`

El paquete [dbt_utils](https://hub.getdbt.com/dbt-labs/dbt_utils/latest/) proporciona macros, tests genéricos y otras utilidades que podemos reutilizar en nuestros proyectos. Por ejemplo, podemos limitar el número de filas nulas que aceptamos para una columna:

```yaml
models:
  - name: orders
    columns:
      - name: id
        tests:
          - dbt_utils.not_null_proportion:
              arguments:
                at_least: 0.95
```

### `codegen`

El paquete [codegen](https://hub.getdbt.com/dbt-labs/codegen/latest/) ofrece utilidades de generación de código **dbt** que ayudan a agilizar nuestros flujos de trabajo. Por ejemplo, dado un origen de datos, podemos 

```bash
uv run dbt run-operation generate_source \
  --args '{
    "schema_name": "prod",
    "database_name": "nytaxi",
    "table_names": ["yellow_tripdata"],
    "generate_columns": true
  }'
```

```yaml
version: 2

sources:
  - name: prod
    tables:
      - name: yellow_tripdata
        columns:
          - name: vendorid
            data_type: bigint
          - name: tpep_pickup_datetime
            data_type: timestamp
          - name: tpep_dropoff_datetime
            data_type: timestamp
          - name: passenger_count
            data_type: bigint
          - name: trip_distance
            data_type: double
          - name: ratecodeid
            data_type: bigint
          - name: store_and_fwd_flag
            data_type: varchar
          - name: pulocationid
            data_type: bigint
          - name: dolocationid
            data_type: bigint
          - name: payment_type
            data_type: bigint
          - name: fare_amount
            data_type: double
          - name: extra
            data_type: double
          - name: mta_tax
            data_type: double
          - name: tip_amount
            data_type: double
          - name: tolls_amount
            data_type: double
          - name: improvement_surcharge
            data_type: double
          - name: total_amount
            data_type: double
          - name: congestion_surcharge
            data_type: varchar
```

### `audit_helper`

El paquete [audit_helper](https://hub.getdbt.com/dbt-labs/audit_helper/latest/) es muy últil a la hora de refactorizar nuestras consultas. Entre otras, ofrece utilidades que permiten comparar línea por línea los resultados de dos consultas. Si, por ejemplo, hubiésemos realizado cambios en nuestra tabla de hechos `fct_orders`, podríamos compararla con su versión anterior usando:

```sql
{% set old_query %}
  select
    id as order_id,
    amount,
    customer_id
  from old_database.old_schema.fct_orders
{% endset %}

{% set new_query %}
  select
    order_id,
    amount,
    customer_id
  from {{ ref('fct_orders') }}
{% endset %}

{{ 
  audit_helper.compare_and_classify_query_results(
    old_query, 
    new_query, 
    primary_key_columns=['order_id'], 
    columns=['order_id', 'amount', 'customer_id']
  )
}}
```

| order_id | order_date | status    | dbt_audit_in_a | dbt_audit_in_b | dbt_audit_row_status | dbt_audit_num_rows_in_status | dbt_audit_sample_number |
|----------|------------|-----------|----------------|----------------|----------------------|------------------------------|-------------------------|
| 1        | 2024-01-01 | completed | True           | True           | identical            | 1                            | 1                       |
| 2        | 2024-01-02 | completed | True           | False          | modified             | 2                            | 1                       |
| 2        | 2024-01-02 | returned  | False          | True           | modified             | 2                            | 1                       |
| 3        | 2024-01-03 | completed | True           | False          | modified             | 2                            | 2                       |
| 3        | 2024-01-03 | completed | False          | True           | modified             | 2                            | 2                       |
| 4        | 2024-01-04 | completed | False          | True           | added                | 1                            | 1                       |

Fuente: [audit_helper's official documentation](https://github.com/dbt-labs/dbt-audit-helper/blob/0.12.2/README.md).

### `dbt_expectations`

El paquete [dbt_expectations](https://hub.getdbt.com/metaplane/dbt_expectations/latest/) ofrece comprobaciones de calidad de datos. Por ejemplo, podemos comprobar que un modelo tiene un número de columnas de un modelo está entre un mínimo y un máximo.

```yaml
models:
  - name: orders
    tests:
    - dbt_expectations.expect_table_column_count_to_be_between:
        min_value: 2
        max_value: 4
```
