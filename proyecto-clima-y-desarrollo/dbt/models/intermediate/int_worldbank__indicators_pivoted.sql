{#
  Pivot the long-format World Bank staging table into one row per
  (country_iso3, year) with a friendly column per indicator. Indicator codes
  not in the case-when list silently drop out — adding a new one means
  adding a new column here.
#}

with src as (

    select
        country_iso3,
        country_name,
        year,
        indicator_code,
        value
    from {{ ref('stg_worldbank__indicators') }}

),

pivoted as (

    select
        country_iso3,
        any_value(country_name) as country_name,
        year,

        max(case when indicator_code = 'NY.GDP.PCAP.CD'      then value end)
            as gdp_per_capita_usd,
        max(case when indicator_code = 'NY.GDP.MKTP.KD.ZG'   then value end)
            as gdp_growth_pct,
        max(case when indicator_code = 'EN.GHG.CO2.PC.CE.AR5' then value end)
            as co2_per_capita_t,
        max(case when indicator_code = 'EG.USE.PCAP.KG.OE'   then value end)
            as energy_per_capita_kgoe,
        max(case when indicator_code = 'EG.FEC.RNEW.ZS'      then value end)
            as renewable_energy_pct,
        max(case when indicator_code = 'SP.URB.TOTL.IN.ZS'   then value end)
            as urban_population_pct,
        max(case when indicator_code = 'NV.IND.TOTL.ZS'      then value end)
            as industry_value_added_pct,
        max(case when indicator_code = 'EN.POP.DNST'         then value end)
            as population_density,
        max(case when indicator_code = 'EN.ATM.PM25.MC.M3'   then value end)
            as pm25_annual_satellite_ugm3,
        max(case when indicator_code = 'SP.POP.TOTL'         then value end)
            as population_total

    from src
    group by country_iso3, year

)

select * from pivoted
