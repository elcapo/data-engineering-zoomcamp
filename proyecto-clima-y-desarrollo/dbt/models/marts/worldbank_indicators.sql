{#
  Long-format mirror of staging, published in marts. One row per
  (indicator_code, country_iso3, year). Useful for analytical queries
  that pivot or filter by indicator without going through the wide
  intermediate table.
#}

{{ config(
    post_hook=[
        "{% if target.type == 'postgres' %}create index if not exists idx_worldbank_indicators_country_year on {{ this }} (country_iso3, year){% else %}{% endif %}"
    ]
) }}

select
    indicator_code,
    country_iso3,
    country_name,
    year,
    value,
    unit,
    obs_status,
    ingested_at,
    source_object
from {{ ref('stg_worldbank__indicators') }}
