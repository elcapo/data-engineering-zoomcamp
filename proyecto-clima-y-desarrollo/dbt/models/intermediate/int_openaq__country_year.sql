{#
  Two-step aggregation:
  1) Daily mean per (country, day, parameter) — gives every day equal weight
     regardless of station polling cadence.
  2) Yearly summary per (country, year) — pivots parameters to wide columns
     (median + count of days exceeding the WHO 2021 daily threshold for PM2.5).

  WHO 2021 daily-mean thresholds we care about:
    pm25 = 15 µg/m³, pm10 = 45, no2 = 25, o3 = 100, so2 = 40
  Only PM2.5 exceedance is materialized as a column (it's the headline
  metric in the dashboard); the others are kept as medians for now.
#}

with daily as (

    select
        country_iso3,
        country_name,
        country_iso2,
        cast(extract(year from datetime_utc) as integer) as year,
        cast(date_trunc('day', datetime_utc) as date) as day,
        parameter,
        avg(value) as daily_mean_value
    from {{ ref('stg_openaq__measurements') }}
    group by 1, 2, 3, 4, 5, 6

),

aggregated as (

    select
        country_iso3,
        any_value(country_name) as country_name,
        any_value(country_iso2) as country_iso2,
        year,

        {{ median("case when parameter = 'pm25' then daily_mean_value end") }}
            as median_pm25_ugm3,
        {{ median("case when parameter = 'pm10' then daily_mean_value end") }}
            as median_pm10_ugm3,
        {{ median("case when parameter = 'no2'  then daily_mean_value end") }}
            as median_no2_ugm3,
        {{ median("case when parameter = 'o3'   then daily_mean_value end") }}
            as median_o3_ugm3,
        {{ median("case when parameter = 'so2'  then daily_mean_value end") }}
            as median_so2_ugm3,

        count(*) filter (
            where parameter = 'pm25' and daily_mean_value > 15
        ) as pm25_days_exceeding_who_daily,

        count(distinct case when parameter = 'pm25' then day end)
            as pm25_day_count,
        count(*) as observation_day_count

    from daily
    group by country_iso3, year

)

select * from aggregated
