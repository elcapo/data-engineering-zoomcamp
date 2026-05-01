with source as (

    select
        indicator_code,
        country_iso3,
        country_name,
        year,
        value,
        unit,
        nullif(obs_status, '') as obs_status,
        ingested_at,
        source_object
    from {{ source('worldbank', 'worldbank_indicators_raw') }}
    where value is not null

)

select * from source
