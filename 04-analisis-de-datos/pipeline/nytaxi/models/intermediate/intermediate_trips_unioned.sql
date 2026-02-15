WITH green_tripdata AS (
    SELECT *,
        'Green' AS service_type
    FROM {{ ref('staging_green_tripdata') }}
),
yellow_tripdata AS (
    SELECT *,
        'Yellow' AS service_type
    FROM {{ ref('staging_yellow_tripdata') }}
),
trips_unioned AS (
    SELECT * FROM green_tripdata
    UNION ALL
    SELECT * FROM yellow_tripdata
)
SELECT *,
    COALESCE(trips_unioned.payment_type, 0) as payment_type,
    COALESCE(payment_type.description, 'Unknown') as payment_type_description
FROM trips_unioned
JOIN {{ ref('payment_type_lookup') }} AS payment_type ON COALESCE(trips_unioned.payment_type, 0) = payment_type.payment_type
