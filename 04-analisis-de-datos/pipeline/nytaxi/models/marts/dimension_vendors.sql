WITH trips_unioned AS (
    SELECT * FROM {{ ref('intermediate_trips_unioned') }}
),
vendors AS (
    SELECT
        DISTINCT vendor_id,
        {{ get_vendor_names('vendor_id') }} AS vendor_name
    FROM trips_unioned
)
SELECT * FROM vendors