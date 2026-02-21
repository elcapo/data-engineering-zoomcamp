"""@bruin

name: ingestion.trips
type: python
image: python:3.11
connection: duckdb-default

materialization:
  type: table
  strategy: append

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
  - name: payment_type
    type: integer
    description: "Payment type code"
  - name: fare_amount
    type: float
    description: "Fare amount in USD (raw; may include negative corrections)"
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
    description: "Total amount charged (raw; may include negative corrections)"
  - name: congestion_surcharge
    type: float
    description: "Congestion surcharge"
  - name: extracted_at
    type: timestamp
    description: "Timestamp when the data was extracted"
    checks:
      - name: not_null

@bruin"""

import io
import json
import os
from datetime import datetime, date, timedelta

import pandas as pd
import requests
from dateutil.relativedelta import relativedelta


def materialize():
    start_date = datetime.strptime(os.environ["BRUIN_START_DATE"], "%Y-%m-%d").date()
    end_date = datetime.strptime(os.environ["BRUIN_END_DATE"], "%Y-%m-%d").date()

    bruin_vars = json.loads(os.environ.get("BRUIN_VARS", "{}"))
    taxi_types = bruin_vars.get("taxi_types", ["yellow"])

    base_url = "https://d37ci6vzurychx.cloudfront.net/trip-data"
    extracted_at = datetime.utcnow()

    all_dfs = []

    # Determine inclusive month range: from start_date's month to the month containing (end_date - 1 day)
    start_month = date(start_date.year, start_date.month, 1)
    last_day = end_date - timedelta(days=1)
    end_month = date(last_day.year, last_day.month, 1)

    current = start_month
    while current <= end_month:
        year_month = current.strftime("%Y-%m")

        for taxi_type in taxi_types:
            url = f"{base_url}/{taxi_type}_tripdata_{year_month}.parquet"
            print(f"Fetching {url}...")

            try:
                response = requests.get(url, timeout=120)
                response.raise_for_status()

                df = pd.read_parquet(io.BytesIO(response.content))

                # Normalize pickup/dropoff column names (differ between yellow and green)
                rename_map = {
                    "PULocationID": "pickup_location_id",
                    "DOLocationID": "dropoff_location_id",
                }
                if taxi_type == "yellow":
                    rename_map["tpep_pickup_datetime"] = "pickup_datetime"
                    rename_map["tpep_dropoff_datetime"] = "dropoff_datetime"
                elif taxi_type == "green":
                    rename_map["lpep_pickup_datetime"] = "pickup_datetime"
                    rename_map["lpep_dropoff_datetime"] = "dropoff_datetime"
                df = df.rename(columns=rename_map)

                df["taxi_type"] = taxi_type
                df["extracted_at"] = extracted_at

                desired_cols = [
                    "taxi_type", "pickup_datetime", "dropoff_datetime",
                    "passenger_count", "trip_distance", "pickup_location_id",
                    "dropoff_location_id", "payment_type", "fare_amount",
                    "extra", "mta_tax", "tip_amount", "tolls_amount",
                    "improvement_surcharge", "total_amount", "congestion_surcharge",
                    "extracted_at",
                ]
                df = df[[c for c in desired_cols if c in df.columns]]

                all_dfs.append(df)
                print(f"Loaded {len(df):,} rows for {taxi_type} {year_month}")

            except requests.HTTPError as e:
                print(f"Warning: Could not fetch {url}: {e}")

        current += relativedelta(months=1)

    if not all_dfs:
        return pd.DataFrame()

    return pd.concat(all_dfs, ignore_index=True)
