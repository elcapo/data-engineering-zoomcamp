SELECT

    -- Identificadores
    trips.vendor_id,
    trips.rate_code_id,
    trips.service_type,

    -- Ubicaciones
    trips.pickup_location_id,
    pickup_zones.borough as pickup_borough,
    pickup_zones.zone as pickup_zone,
    trips.dropoff_location_id,
    dropoff_zones.borough as dropoff_borough,
    dropoff_zones.zone as dropoff_zone,

    -- Duraciones
    trips.pickup_datetime,
    trips.dropoff_datetime,
    trips.store_and_fwd_flag,

    -- Métricas
    trips.passenger_count,
    trips.trip_distance,
    trips.trip_type,
    {{ get_trip_duration_minutes('trips.pickup_datetime', 'trips.dropoff_datetime') }} as trip_duration_minutes,

    -- Pago
    trips.fare_amount,
    trips.extra,
    trips.mta_tax,
    trips.tip_amount,
    trips.tolls_amount,
    trips.ehail_fee,
    trips.improvement_surcharge,
    trips.total_amount,
    trips.payment_type,
    trips.payment_type_description

FROM {{ ref('intermediate_trips_unioned') }} AS trips
LEFT JOIN {{ ref('dimension_zones') }} AS pickup_zones ON trips.pickup_location_id = pickup_zones.location_id
LEFT JOIN {{ ref('dimension_zones') }} AS dropoff_zones ON trips.dropoff_location_id = dropoff_zones.location_id
