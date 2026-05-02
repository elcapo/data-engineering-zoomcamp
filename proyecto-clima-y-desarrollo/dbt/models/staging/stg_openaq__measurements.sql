with source as (

    select
        location_id,
        location_name,
        upper(country_iso) as country_iso2,
        sensor_id,
        parameter,
        unit,
        value,
        datetime_utc,
        latitude,
        longitude
    from {{ source('openaq', 'openaq_measurements') }}
    where value is not null
      and country_iso is not null
      -- OpenAQ uses negative sentinels (-9999, -9.999) for missing/errored
      -- readings; some sensors also emit absurd positive spikes (>800k µg/m³).
      -- Filter both so downstream medians stay in physical ranges.
      and value >= 0
      and value < 10000

),

reconciled as (

    select
        s.location_id,
        s.location_name,
        s.country_iso2,
        c.iso3 as country_iso3,
        c.country_name,
        s.sensor_id,
        s.parameter,
        s.unit,
        s.value,
        s.datetime_utc
    from source s
    inner join {{ ref('country_iso_codes') }} c
        on s.country_iso2 = c.iso2

)

select * from reconciled
