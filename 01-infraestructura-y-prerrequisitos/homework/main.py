from os.path import isfile
from urllib.request import urlretrieve
import pandas as pd


def download_files():
    trips_url = "https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2025-11.parquet"
    zones_url = "https://github.com/DataTalksClub/nyc-tlc-data/releases/download/misc/taxi_zone_lookup.csv"
    urlretrieve(trips_url, "tripdata.parquet")
    urlretrieve(zones_url, "zones.csv")


def count_short_trips(trips):
    trip_count = trips[
        (trips.lpep_pickup_datetime >= '2025-11-01') &
        (trips.lpep_pickup_datetime < '2025-12-01') &
        (trips.trip_distance <= 1)
    ].shape[0]

    print(f"Counting short trips: {trip_count}\n")


def day_of_the_longest_trip(trips):
    day = (
        trips
            [trips.trip_distance < 100]
            [['lpep_pickup_datetime', 'trip_distance']]
            .sort_values(by=['trip_distance'], ascending=False)
            .head(1)
    )

    print(f"The pickup day with the longest trip was:\n{day}\n")


def pickup_zone_with_largest_total_amount(trips, zones, from_included, to_excluded):
    zones_by_amount = (
        trips
            [(trips.lpep_pickup_datetime >= from_included) & (trips.lpep_pickup_datetime < to_excluded)]
            [['PULocationID', 'total_amount']]
            .groupby(by="PULocationID")
            .sum()
            .sort_values(by='total_amount', ascending=False)
    )

    best_zone_id = zones_by_amount.index[0]
    best_zone = zones[zones.LocationID == best_zone_id]

    print(f"The pickup zone with the largest total amount in the specificed range is:\n{best_zone}\n")


def drop_off_zone_with_largest_tip(trips, zones, pickup_zone):
    pickup_zone_id = zones[zones.Zone == pickup_zone].iloc[0].LocationID

    best_tips_by_drop_off_zone = (
        trips
            [(trips.PULocationID == pickup_zone_id) & (trips.lpep_pickup_datetime >= '2025-11-01') & (trips.lpep_pickup_datetime < '2025-12-01')]
            [['DOLocationID', 'tip_amount']]
            .sort_values(by='tip_amount', ascending=False)
    )

    drop_off_zone_id = best_tips_by_drop_off_zone.iloc[0].DOLocationID
    drop_off_zone = zones[zones.LocationID == drop_off_zone_id]

    print(f"The drop off zone with the best tip is:\n{drop_off_zone}\n")


def main():
    if not isfile("tripdata.parquet") or not isfile("zones.csv"):
        download_files()

    trips = pd.read_parquet("tripdata.parquet")
    zones = pd.read_csv("zones.csv")

    count_short_trips(trips)
    day_of_the_longest_trip(trips)
    pickup_zone_with_largest_total_amount(trips, zones, '2025-11-18', '2025-11-19')
    drop_off_zone_with_largest_tip(trips, zones, 'East Harlem North')


if __name__ == "__main__":
    main()
