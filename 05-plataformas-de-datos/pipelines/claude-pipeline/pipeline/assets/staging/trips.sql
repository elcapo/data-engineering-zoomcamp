/* @bruin

name: staging.trips
type: duckdb.sql

depends:
  - ingestion.trips
  - ingestion.payment_lookup

materialization:
  type: table
  strategy: time_interval
  incremental_key: pickup_datetime
  time_granularity: timestamp

columns:
  - name: taxi_type
    type: string
    description: "Type of taxi: yellow or green"
    checks:
      - name: not_null
      - name: accepted_values
        value: ["yellow", "green"]
  - name: pickup_datetime
    type: timestamp
    description: "Trip pickup datetime"
    primary_key: true
    nullable: false
    checks:
      - name: not_null
  - name: dropoff_datetime
    type: timestamp
    description: "Trip dropoff datetime"
    checks:
      - name: not_null
  - name: passenger_count
    type: integer
    description: "Number of passengers"
  - name: trip_distance
    type: float
    description: "Trip distance in miles"
    checks:
      - name: non_negative
  - name: pickup_location_id
    type: integer
    description: "TLC Taxi Zone pickup location ID"
  - name: dropoff_location_id
    type: integer
    description: "TLC Taxi Zone dropoff location ID"
  - name: payment_type_id
    type: integer
    description: "Payment type code"
  - name: payment_type_name
    type: string
    description: "Human-readable payment type name from lookup"
  - name: fare_amount
    type: float
    description: "Fare amount in USD"
    checks:
      - name: non_negative
  - name: extra
    type: float
    description: "Extra charges"
  - name: mta_tax
    type: float
    description: "MTA tax amount"
  - name: tip_amount
    type: float
    description: "Tip amount"
  - name: tolls_amount
    type: float
    description: "Tolls amount"
  - name: improvement_surcharge
    type: float
    description: "Improvement surcharge"
  - name: total_amount
    type: float
    description: "Total amount charged"
    checks:
      - name: non_negative
  - name: congestion_surcharge
    type: float
    description: "Congestion surcharge"

custom_checks:
  - name: no_duplicate_trips
    description: "Ensure no duplicate trips exist in the staging window based on composite key"
    query: |
      SELECT COUNT(*) FROM (
          SELECT
              pickup_datetime,
              dropoff_datetime,
              pickup_location_id,
              dropoff_location_id,
              fare_amount,
              COUNT(*) AS cnt
          FROM staging.trips
          WHERE pickup_datetime >= '{{ start_datetime }}'
            AND pickup_datetime < '{{ end_datetime }}'
          GROUP BY
              pickup_datetime,
              dropoff_datetime,
              pickup_location_id,
              dropoff_location_id,
              fare_amount
          HAVING cnt > 1
      )
    value: 0

@bruin */

-- Deduplicate using ROW_NUMBER over composite trip key, then enrich with payment lookup
WITH deduplicated AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY pickup_datetime, dropoff_datetime, pickup_location_id, dropoff_location_id, fare_amount
            ORDER BY extracted_at DESC
        ) AS row_num
    FROM ingestion.trips
    WHERE pickup_datetime >= '{{ start_datetime }}'
      AND pickup_datetime < '{{ end_datetime }}'
      AND pickup_datetime IS NOT NULL
      AND fare_amount >= 0
      AND total_amount >= 0
)
SELECT
    t.taxi_type,
    t.pickup_datetime,
    t.dropoff_datetime,
    t.passenger_count,
    t.trip_distance,
    t.pickup_location_id,
    t.dropoff_location_id,
    t.payment_type     AS payment_type_id,
    p.payment_type_name,
    t.fare_amount,
    t.extra,
    t.mta_tax,
    t.tip_amount,
    t.tolls_amount,
    t.improvement_surcharge,
    t.total_amount,
    t.congestion_surcharge
FROM deduplicated t
LEFT JOIN ingestion.payment_lookup p ON t.payment_type = p.payment_type_id
WHERE t.row_num = 1
