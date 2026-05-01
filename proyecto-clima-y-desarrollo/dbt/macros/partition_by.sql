{#
  Adapter-aware PARTITION BY clause.

  - BigQuery: emits the native `partition by ...` config so dbt sets it on
    the destination table.
  - Postgres / DuckDB / others: returns an empty config (no-op). Native
    PARTITION BY in Postgres is achieved with a separate macro that issues
    DDL outside dbt's materialization (see `ensure_monthly_partitions` in a
    later slice); this macro intentionally stays adapter-neutral.

  Usage in a model:
    {{ config(materialized='table', **partition_by('event_ts', granularity='day')) }}
#}

{% macro partition_by(column, granularity='day', data_type='timestamp') %}
    {% if target.type == 'bigquery' %}
        {% do return({
            'partition_by': {
                'field': column,
                'data_type': data_type,
                'granularity': granularity,
            }
        }) %}
    {% else %}
        {% do return({}) %}
    {% endif %}
{% endmacro %}
