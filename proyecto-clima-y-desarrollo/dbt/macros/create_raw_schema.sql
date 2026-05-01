{#
  Creates the `raw` schema and the World Bank landing table.
  Slice 1: idempotent setup before the producer's load step writes any rows.
  Future slices add OpenAQ raw tables here.
#}

{% macro create_raw_schema() %}

{% set ddl %}
CREATE SCHEMA IF NOT EXISTS raw;

CREATE TABLE IF NOT EXISTS raw.worldbank_indicators_raw (
    indicator_code TEXT NOT NULL,
    country_iso3   TEXT NOT NULL,
    country_name   TEXT,
    year           INTEGER NOT NULL,
    value          DOUBLE PRECISION,
    unit           TEXT,
    obs_status     TEXT,
    ingested_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    source_object  TEXT NOT NULL,
    PRIMARY KEY (indicator_code, country_iso3, year)
);
{% endset %}

{% do run_query(ddl) %}
{% do log("Raw schema and worldbank_indicators_raw table ensured.", info=true) %}

{% endmacro %}
