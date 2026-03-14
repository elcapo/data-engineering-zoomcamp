SELECT PULocationID, num_trips
FROM aggregated_pickup
ORDER BY num_trips DESC
LIMIT 3;