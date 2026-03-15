CREATE TABLE IF NOT EXISTS enriched_rides (
    PULocationID INTEGER,
    pickup_zone VARCHAR,
    DOLocationID INTEGER,
    dropoff_zone VARCHAR,
    trip_distance DOUBLE PRECISION,
    total_amount DOUBLE PRECISION,
    pickup_datetime TIMESTAMP
);
