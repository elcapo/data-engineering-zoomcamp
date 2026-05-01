{#
  Creates the `raw` and `agg` schemas plus the landing tables that external
  processes (Python loaders, Flink jobs) write to. dbt does not own these
  tables as models — it just guarantees the schema exists before the
  producers come up.

  Idempotent: safe to re-run on every dbt invocation via on-run-start.
#}

{% macro create_raw_schema() %}

{% set ddl %}
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS agg;

-- World Bank batch landing (slice 1)
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

-- OpenAQ stream mirror (slice 3, written by Flink)
CREATE TABLE IF NOT EXISTS raw.openaq_measurements (
    location_id    BIGINT NOT NULL,
    location_name  TEXT,
    country_iso    TEXT,
    sensor_id      BIGINT NOT NULL,
    parameter      TEXT NOT NULL,
    unit           TEXT,
    value          DOUBLE PRECISION,
    datetime_utc   TIMESTAMP NOT NULL,
    datetime_local TEXT,
    latitude       DOUBLE PRECISION,
    longitude      DOUBLE PRECISION,
    PRIMARY KEY (location_id, parameter, datetime_utc)
);
CREATE INDEX IF NOT EXISTS idx_openaq_country_param_ts
    ON raw.openaq_measurements (country_iso, parameter, datetime_utc);

CREATE TABLE IF NOT EXISTS agg.openaq_hourly (
    window_start  TIMESTAMP NOT NULL,
    window_end    TIMESTAMP NOT NULL,
    country_iso   TEXT NOT NULL,
    parameter     TEXT NOT NULL,
    avg_value     DOUBLE PRECISION,
    sample_count  BIGINT,
    PRIMARY KEY (window_start, country_iso, parameter)
);

CREATE TABLE IF NOT EXISTS agg.openaq_daily (
    window_start  TIMESTAMP NOT NULL,
    window_end    TIMESTAMP NOT NULL,
    country_iso   TEXT NOT NULL,
    parameter     TEXT NOT NULL,
    avg_value     DOUBLE PRECISION,
    sample_count  BIGINT,
    PRIMARY KEY (window_start, country_iso, parameter)
);
{% endset %}

{% do run_query(ddl) %}
{% do log("Raw / agg schemas and landing tables ensured.", info=true) %}

{% endmacro %}
