import os
import sys
import json
from time import time
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
import dataclasses
from dataclasses import dataclass
from kafka import KafkaProducer

load_dotenv()

@dataclass
class GreenRide:
    lpep_pickup_datetime: str
    lpep_dropoff_datetime: str
    PULocationID: int
    DOLocationID: int
    passenger_count: int
    trip_distance: float
    tip_amount: float
    total_amount: float

def green_ride_from_row(row):
    return GreenRide(
        lpep_pickup_datetime=str(row['lpep_pickup_datetime']),
        lpep_dropoff_datetime=str(row['lpep_dropoff_datetime']),
        PULocationID=int(row['PULocationID']),
        DOLocationID=int(row['DOLocationID']),
        passenger_count=int(row['passenger_count'] if type(row['passenger_count']) == int else 0),
        trip_distance=float(row['trip_distance']),
        tip_amount=float(row['tip_amount']),
        total_amount=float(row['total_amount']),
    )

def green_ride_serializer(ride: GreenRide) -> bytes:
    return json.dumps(dataclasses.asdict(ride)).encode('utf-8')

def green_ride_deserializer(data: bytes) -> GreenRide:
    return GreenRide(**json.loads(data.decode('utf-8')))

def load_producer():
    redpanda_port = os.getenv('REDPANDA_PORT', '9092')
    producer = KafkaProducer(
        bootstrap_servers=[f'localhost:{redpanda_port}'],
        value_serializer=green_ride_serializer,
    )

    url = "https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2025-10.parquet"

    columns = [
        'lpep_pickup_datetime',
        'lpep_dropoff_datetime',
        'PULocationID',
        'DOLocationID',
        'passenger_count',
        'trip_distance',
        'tip_amount',
        'total_amount',
    ]

    local_path = Path(__file__).parent / 'data' / 'green_tripdata_2025-10.parquet'

    if local_path.exists():
        dataframe = pd.read_parquet(local_path, columns=columns)
    else:
        print('El fichero no fue encontrado localmente, por lo que será descargado. Esto puede tardar unos minutos...')
        local_path.parent.mkdir(exist_ok=True)
        dataframe = pd.read_parquet(url, columns=columns)
        dataframe.to_parquet(local_path, index=False)

    return producer, dataframe

def main(producer, dataframe):
    topic_name = 'green-trips'

    start_time = time()

    for _, row in dataframe.iterrows():
        ride = green_ride_from_row(row)
        producer.send(topic_name, value=ride)

    producer.flush()

    end_time = time()

    print(f'El proceso tardó {(end_time - start_time):.2f} segundos')

if __name__ == "__main__":
    producer, dataframe = load_producer()
    print('Productor iniciado. Enviando datos...')

    try:
        main(producer, dataframe)
        print('¡Todos los datos fueron enviados con éxito!')
    except KeyboardInterrupt:
        producer.flush()
        print("\n¡El productor fue detenido!")
