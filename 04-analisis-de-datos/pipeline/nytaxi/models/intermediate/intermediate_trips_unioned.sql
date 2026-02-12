WITH green_tripdata AS (
    SELECT * FROM {{ ref('staging_green_tripdata') }}
),
yellow_tripdata AS (
    SELECT * FROM {{ ref('staging_yellow_tripdata') }}
),
trips_unioned AS (
    SELECT * FROM green_tripdata
    UNION ALL
    SELECT * FROM yellow_tripdata
)
SELECT * FROM trips_unioned