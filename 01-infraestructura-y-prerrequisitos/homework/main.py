from os.path import isfile
from urllib.request import urlretrieve
import pandas as pd


def download_files():
    tripdata_url = "https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2025-11.parquet"
    zones_url = "https://github.com/DataTalksClub/nyc-tlc-data/releases/download/misc/taxi_zone_lookup.csv"
    urlretrieve(tripdata_url, "tripdata.parquet")
    urlretrieve(zones_url, "zones.csv")


def count_short_trips(tripdata_df):
    trip_count = tripdata_df[
        (tripdata_df.lpep_pickup_datetime >= '2025-11-01') &
        (tripdata_df.lpep_pickup_datetime < '2025-12-01') &
        (tripdata_df.trip_distance <= 1)
    ].shape[0]

    print(f"Counting short trips: {trip_count}")


def main():
    if not isfile("tripdata.parquet") or not isfile("zones.csv"):
        download_files()

    tripdata_df = pd.read_parquet("tripdata.parquet")
    count_short_trips(tripdata_df)


if __name__ == "__main__":
    main()
