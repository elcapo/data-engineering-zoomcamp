{#
  Adapter-aware CLUSTER BY clause.

  - BigQuery: emits a `cluster_by` config dbt applies on the destination table.
  - Other adapters: no-op. In Postgres the equivalent is a btree index, which
    is created via a post-hook or a separate macro per model.

  Usage:
    {{ config(materialized='table', **cluster_by(['country_iso3', 'parameter'])) }}
#}

{% macro cluster_by(columns) %}
    {% if target.type == 'bigquery' %}
        {% do return({'cluster_by': columns}) %}
    {% else %}
        {% do return({}) %}
    {% endif %}
{% endmacro %}
