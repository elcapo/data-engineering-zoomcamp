import json
import dataclasses
import random
import time
from dataclasses import dataclass

@dataclass
class Ride:
    PULocationID: int
    DOLocationID: int
    trip_distance: float
    total_amount: float
    tpep_pickup_datetime: int  # época en milisegundos

def ride_from_row(row):
    return Ride(
        PULocationID=int(row['PULocationID']),
        DOLocationID=int(row['DOLocationID']),
        trip_distance=float(row['trip_distance']),
        total_amount=float(row['total_amount']),
        tpep_pickup_datetime=int(row['tpep_pickup_datetime'].timestamp() * 1000),
    )

# See https://d37ci6vzurychx.cloudfront.net/misc/taxi_zone_lookup.csv
LOCATIONS = {
    79: "East Village, Manhattan",
    107: "Gramercy, Manhattan",
    48: "Clinton East (Hell's Kitchen), Manhattan",
    132: "JFK Airport",
    234: "Union Sq, Manhattan",
    148: "Lower East Side, Manhattan",
    249: "West Village, Manhattan",
    68: "East Chelsea, Manhattan",
    90: "Flatiron, Manhattan",
    263: "Yorkville West, Manhattan",
    138: "LaGuardia Airport",
    230: "Times Sq/Theatre District, Manhattan",
    161: "Midtown Center, Manhattan",
    162: "Midtown East, Manhattan",
    170: "Murray Hill, Manhattan",
    237: "Upper East Side South, Manhattan",
    239: "Upper West Side South, Manhattan",
    186: "Penn Station/Madison Sq West, Manhattan",
    164: "Midtown South, Manhattan",
    236: "Upper East Side North, Manhattan",
}

def random_ride(delay_seconds=0):
    return Ride(
        PULocationID=random.choice(list(LOCATIONS.keys())),
        DOLocationID=random.choice(list(LOCATIONS.keys())),
        trip_distance=round(random.uniform(0.5, 20.0), 2),
        total_amount=round(random.uniform(5.0, 100.0), 2),
        tpep_pickup_datetime=int(time.time() * 1000) - delay_seconds * 1000,
    )

def ride_serializer(ride: Ride) -> bytes:
    return json.dumps(dataclasses.asdict(ride)).encode('utf-8')

def ride_deserializer(data: bytes) -> Ride:
    return Ride(**json.loads(data.decode('utf-8')))
