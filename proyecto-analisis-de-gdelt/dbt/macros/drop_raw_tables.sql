{#
  Drops the raw tables written by Flink (events, mentions, gkg) so that
  `create_raw_tables()` can recreate them — typically when migrating from
  the non-partitioned layout to the partitioned one.

  Aggregation tables (event_counts_by_country, conflict_trend, ...) are
  left untouched: they have small volume and their schema is unchanged.

  Run manually: `dbt run-operation drop_raw_tables`.
#}

{% macro drop_raw_tables() %}

{% set ddl %}
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS mentions CASCADE;
DROP TABLE IF EXISTS gkg CASCADE;
{% endset %}

{% do run_query(ddl) %}
{% do log("Dropped raw tables (events, mentions, gkg).", info=true) %}

{% endmacro %}
