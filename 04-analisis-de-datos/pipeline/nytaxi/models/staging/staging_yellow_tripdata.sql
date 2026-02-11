SELECT

    -- identifiers
    CAST(vendorid AS INT) AS vendor_id,
    CAST(ratecodeid AS INT) AS rate_code_id,
    CAST(pulocationid AS INT) AS pickup_location_id,
    CAST(dolocationid AS INT) AS dropoff_location_id,

    -- timestamps
    CAST(tpep_pickup_datetime AS TIMESTAMP) AS pickup_datetime,
    CAST(tpep_dropoff_datetime AS TIMESTAMP) AS dropoff_datetime,

    -- trip info
    store_and_fwd_flag,
    CAST(passenger_count AS INT) AS passenger_count,
    CAST(trip_distance AS NUMERIC) AS trip_distance,

    -- payment info
    CAST(fare_amount AS NUMERIC) AS fare_amount,
    CAST(extra AS NUMERIC) AS extra,
    CAST(mta_tax AS NUMERIC) AS mta_tax,
    CAST(tip_amount AS NUMERIC) AS tip_amount,
    CAST(tolls_amount AS NUMERIC) AS tolls_amount,
    CAST(improvement_surcharge AS NUMERIC) AS improvement_surcharge,
    CAST(congestion_surcharge AS NUMERIC) AS congestion_surcharge,
    CAST(total_amount AS NUMERIC) AS total_amount,
    CAST(payment_type AS INT) AS payment_type

FROM {{ source('raw_data', 'yellow_tripdata') }}
WHERE vendorid IS NOT NULL
