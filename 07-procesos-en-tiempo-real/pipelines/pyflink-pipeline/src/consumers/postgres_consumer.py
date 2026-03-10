import os
import sys
import psycopg2
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
from kafka import KafkaConsumer

sys.path.insert(0, str(Path(__file__).parent.parent))
from models import ride_deserializer

load_dotenv()

def main():
    connection = psycopg2.connect(
        host='localhost',
        port=int(os.getenv('POSTGRES_PORT', '5432')),
        database='postgres',
        user='postgres',
        password=os.getenv('POSTGRES_PASSWORD', 'postgres')
    )

    connection.autocommit = True
    cursor = connection.cursor()

    redpanda_port = os.getenv('REDPANDA_PORT', '9092')
    consumer = KafkaConsumer(
        'rides',
        bootstrap_servers=[f'localhost:{redpanda_port}'],
        auto_offset_reset='earliest',
        group_id='rides-to-postgres',
        value_deserializer=ride_deserializer
    )

    for message in consumer:
        ride = message.value
        print(ride)

        pickup_datetime = datetime.fromtimestamp(ride.tpep_pickup_datetime / 1000)
        cursor.execute(
            """INSERT INTO processed_events
            (PULocationID, DOLocationID, trip_distance, total_amount, pickup_datetime)
            VALUES (%s, %s, %s, %s, %s)""",
            (ride.PULocationID, ride.DOLocationID, ride.trip_distance, ride.total_amount, pickup_datetime)
        )

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n¡El consumidor fue detenido!")