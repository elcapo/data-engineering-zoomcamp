import json
import os
import struct
import sys
import time
from io import BytesIO
from pathlib import Path

import fastavro
import pandas as pd
import requests
from dotenv import load_dotenv
from kafka import KafkaProducer

sys.path.insert(0, str(Path(__file__).parent.parent))
from models import ride_from_row

load_dotenv()

SCHEMA_REGISTRY_URL = os.getenv('SCHEMA_REGISTRY_URL', 'http://localhost:18081')


def register_schema(schema_str: str, subject: str) -> int:
    response = requests.post(
        f'{SCHEMA_REGISTRY_URL}/subjects/{subject}/versions',
        headers={'Content-Type': 'application/vnd.schemaregistry.v1+json'},
        json={'schema': schema_str}
    )
    response.raise_for_status()
    return response.json()['id']


def make_avro_serializer(schema, schema_id: int):
    def serialize(record: dict) -> bytes:
        buf = BytesIO()
        buf.write(b'\x00')                      # magic byte
        buf.write(struct.pack('>I', schema_id)) # schema ID (4 bytes, big-endian)
        fastavro.schemaless_writer(buf, schema, record)
        return buf.getvalue()
    return serialize


def load_producer():
    schema_path = Path(__file__).parent.parent / 'schemas' / 'ride.avsc'
    with open(schema_path) as f:
        schema_str = f.read()

    parsed_schema = fastavro.parse_schema(json.loads(schema_str))
    schema_id = register_schema(schema_str, 'rides-value')
    print(f'Esquema registrado con ID: {schema_id}')

    redpanda_port = os.getenv('REDPANDA_PORT', '9092')
    producer = KafkaProducer(
        bootstrap_servers=[f'localhost:{redpanda_port}'],
        value_serializer=make_avro_serializer(parsed_schema, schema_id)
    )

    url = "https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_2025-11.parquet"
    columns = ['PULocationID', 'DOLocationID', 'trip_distance', 'total_amount', 'tpep_pickup_datetime']
    local_path = Path(__file__).parent / 'data' / 'yellow_tripdata_2025-11.parquet'

    if local_path.exists():
        dataframe = pd.read_parquet(local_path, columns=columns).head(1000)
    else:
        print('El fichero no fue encontrado localmente, por lo que será descargado. Esto puede tardar unos minutos...')
        local_path.parent.mkdir(exist_ok=True)
        dataframe = pd.read_parquet(url, columns=columns).head(1000)
        dataframe.to_parquet(local_path, index=False)

    return producer, dataframe


def main(producer, dataframe):
    topic_name = 'rides'

    for _, row in dataframe.iterrows():
        ride = ride_from_row(row)
        record = {
            'PULocationID':         ride.PULocationID,
            'DOLocationID':         ride.DOLocationID,
            'trip_distance':        ride.trip_distance,
            'total_amount':         ride.total_amount,
            'tpep_pickup_datetime': ride.tpep_pickup_datetime,
        }
        print(record)
        producer.send(topic_name, value=record)
        time.sleep(0.01)


if __name__ == '__main__':
    producer, dataframe = load_producer()
    print('Productor Avro iniciado. Enviando datos...')

    try:
        main(producer, dataframe)
        print('¡Todos los datos fueron enviados con éxito!')
    except KeyboardInterrupt:
        print("\n¡El productor fue detenido!")

    producer.flush()
