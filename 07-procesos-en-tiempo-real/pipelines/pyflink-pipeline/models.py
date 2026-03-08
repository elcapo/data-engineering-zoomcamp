import json
import dataclasses
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

def ride_serializer(ride: Ride) -> bytes:
    return json.dumps(dataclasses.asdict(ride)).encode('utf-8')

def ride_deserializer(data: bytes) -> Ride:
    return Ride(**json.loads(data.decode('utf-8')))
