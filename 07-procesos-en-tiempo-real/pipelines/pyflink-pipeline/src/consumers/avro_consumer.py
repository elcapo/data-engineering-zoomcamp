import json
import os
import struct
import sys
from io import BytesIO
from pathlib import Path

import fastavro
import requests
from dotenv import load_dotenv
from kafka import KafkaConsumer

sys.path.insert(0, str(Path(__file__).parent.parent))
from models import Ride

load_dotenv()

SCHEMA_REGISTRY_URL = os.getenv('SCHEMA_REGISTRY_URL', 'http://localhost:18081')


def fetch_schema(schema_id: int) -> dict:
    response = requests.get(f'{SCHEMA_REGISTRY_URL}/schemas/ids/{schema_id}')
    response.raise_for_status()
    return fastavro.parse_schema(json.loads(response.json()['schema']))


def make_avro_deserializer():
    schema_cache = {}

    def deserialize(data: bytes) -> Ride:
        buf = BytesIO(data)
        magic = buf.read(1)
        if magic != b'\x00':
            raise ValueError(f'Byte mágico inesperado: {magic!r}')

        schema_id = struct.unpack('>I', buf.read(4))[0]
        if schema_id not in schema_cache:
            schema_cache[schema_id] = fetch_schema(schema_id)

        record = fastavro.schemaless_reader(buf, schema_cache[schema_id])
        return Ride(**record)

    return deserialize


def main():
    redpanda_port = os.getenv('REDPANDA_PORT', '9092')
    consumer = KafkaConsumer(
        'structured_rides',
        bootstrap_servers=[f'localhost:{redpanda_port}'],
        auto_offset_reset='earliest',
        group_id='rides-avro-console',
        value_deserializer=make_avro_deserializer()
    )

    for message in consumer:
        ride = message.value
        print(ride)


if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n¡El consumidor fue detenido!")
