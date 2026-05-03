{#
  The project's headline mart: World Bank development indicators joined to
  OpenAQ air-quality aggregations at (country_iso3, year). FULL OUTER JOIN
  is intentional — the dashboard's choropleth needs WB-only countries even
  when no OpenAQ stations exist there, and vice versa.
#}

{{ config(
    post_hook=[
        "{% if target.type == 'postgres' %}create index if not exists idx_country_year_environment on {{ this }} (country_iso3, year){% else %}{% endif %}"
    ]
) }}

with wb as (

    select * from {{ ref('int_worldbank__indicators_pivoted') }}

),

aq as (

    select * from {{ ref('int_openaq__country_year') }}

),

joined as (

    select
        coalesce(wb.country_iso3, aq.country_iso3) as country_iso3,
        coalesce(wb.country_name, aq.country_name) as country_name,
        coalesce(wb.year, aq.year)                 as year,

        wb.gdp_per_capita_usd,
        wb.gdp_growth_pct,
        wb.co2_per_capita_t,
        wb.energy_per_capita_kgoe,
        wb.renewable_energy_pct,
        wb.urban_population_pct,
        wb.industry_value_added_pct,
        wb.population_density,
        wb.pm25_annual_satellite_ugm3,
        wb.population_total,

        aq.median_pm25_ugm3,
        aq.median_pm10_ugm3,
        aq.median_no2_ugm3,
        aq.median_o3_ugm3,
        aq.median_so2_ugm3,
        aq.pm25_days_exceeding_who_daily,
        aq.pm25_day_count,
        aq.observation_day_count

    from wb
    full outer join aq
        on wb.country_iso3 = aq.country_iso3
       and wb.year         = aq.year

)

select * from joined
