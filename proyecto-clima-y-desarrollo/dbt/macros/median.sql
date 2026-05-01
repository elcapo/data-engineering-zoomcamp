{#
  Adapter-aware median (50th percentile).

  - Postgres: percentile_cont(0.5) within group (order by ...). NULLs are
    ignored automatically.
  - BigQuery: APPROX_QUANTILES(value, 100)[OFFSET(50)] (approximate; sufficient
    for analytical aggregations).

  Usage:
    select {{ median('value') }} as median_value from t
    select {{ median("case when parameter = 'pm25' then value end") }} as median_pm25 from t
#}

{% macro median(expr) %}
    {%- if target.type == 'bigquery' -%}
        approx_quantiles({{ expr }}, 100)[offset(50)]
    {%- else -%}
        percentile_cont(0.5) within group (order by {{ expr }})
    {%- endif -%}
{% endmacro %}
