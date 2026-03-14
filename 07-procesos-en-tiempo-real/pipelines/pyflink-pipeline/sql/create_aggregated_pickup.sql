CREATE TABLE IF NOT EXISTS aggregated_pickup (
    window_start TIMESTAMP(3),
    PULocationID INT,
    num_trips BIGINT,
    PRIMARY KEY (window_start, PULocationID)
);
