CREATE TABLE IF NOT EXISTS aggregated_tips_per_hour (
    window_start TIMESTAMP(3),
    total_tips   DOUBLE PRECISION,
    PRIMARY KEY (window_start)
);
