{#
  Ensures monthly RANGE partitions exist for a partitioned table.

  Creates one partition per month in the window
      [CURRENT_DATE - months_back, CURRENT_DATE + months_forward]
  plus a DEFAULT partition that catches any row outside the range
  (e.g. replayed historical data from Kafka, or a clock skew).

  Idempotent: safe to run on every `dbt run`.
#}

{% macro ensure_monthly_partitions(table_name, months_back=1, months_forward=2) %}

{% set ddl %}
DO $$
DECLARE
    start_month date;
    m date;
    part_name text;
    from_val date;
    to_val date;
BEGIN
    start_month := date_trunc('month', CURRENT_DATE)::date - make_interval(months => {{ months_back }});
    FOR i IN 0..({{ months_back }} + {{ months_forward }}) LOOP
        m := start_month + make_interval(months => i);
        part_name := format('{{ table_name }}_%s', to_char(m, 'YYYYMM'));
        from_val := m;
        to_val := (m + interval '1 month')::date;
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS %I PARTITION OF {{ table_name }} FOR VALUES FROM (%L) TO (%L)',
            part_name, from_val, to_val
        );
    END LOOP;

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF {{ table_name }} DEFAULT',
        '{{ table_name }}_default'
    );
END $$;
{% endset %}

{% do run_query(ddl) %}
{% do log("Ensured monthly partitions for " ~ table_name ~ " (back=" ~ months_back ~ ", forward=" ~ months_forward ~ ").", info=true) %}

{% endmacro %}
