/* @bruin

name: reports.trips_report
type: duckdb.sql

depends:
  - staging.trips

materialization:
  type: table
  strategy: time_interval
  incremental_key: trip_date
  time_granularity: date

columns:
  - name: trip_date
    type: date
    description: "Date of the trip (truncated from pickup_datetime)"
    primary_key: true
    checks:
      - name: not_null
  - name: taxi_type
    type: string
    description: "Type of taxi: yellow or green"
    primary_key: true
    checks:
      - name: not_null
  - name: payment_type_name
    type: string
    description: "Payment type name (unknown if not matched)"
    primary_key: true
    checks:
      - name: not_null
  - name: trip_count
    type: bigint
    description: "Number of trips"
    checks:
      - name: non_negative
  - name: total_fare
    type: float
    description: "Sum of fare amounts for the group"
    checks:
      - name: non_negative
  - name: avg_trip_distance
    type: float
    description: "Average trip distance in miles"
    checks:
      - name: non_negative
  - name: total_amount
    type: float
    description: "Sum of total amounts charged"
    checks:
      - name: non_negative

@bruin */

SELECT
    DATE_TRUNC('day', pickup_datetime)::DATE        AS trip_date,
    taxi_type,
    COALESCE(payment_type_name, 'unknown')          AS payment_type_name,
    COUNT(*)                                        AS trip_count,
    SUM(fare_amount)                                AS total_fare,
    AVG(trip_distance)                              AS avg_trip_distance,
    SUM(total_amount)                               AS total_amount
FROM staging.trips
WHERE pickup_datetime >= '{{ start_datetime }}'
  AND pickup_datetime < '{{ end_datetime }}'
GROUP BY 1, 2, 3
