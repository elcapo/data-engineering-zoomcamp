{#
  Override the default schema-name resolver so that `+schema: staging` lands
  in the `staging` schema (not `public_staging`). Keeps schema names stable
  between Postgres and BigQuery.
#}

{% macro generate_schema_name(custom_schema_name, node) -%}
    {%- if custom_schema_name is none -%}
        {{ target.schema }}
    {%- else -%}
        {{ custom_schema_name | trim }}
    {%- endif -%}
{%- endmacro %}
