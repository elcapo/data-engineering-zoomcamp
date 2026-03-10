CREATE TABLE IF NOT EXISTS processed_events_aggregated (
    window_start TIMESTAMP(3),
    PULocationID INT,
    num_trips BIGINT,
    total_revenue DOUBLE PRECISION,
    PRIMARY KEY (window_start, PULocationID)
);