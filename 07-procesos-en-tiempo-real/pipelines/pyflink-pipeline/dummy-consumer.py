import os
from dotenv import load_dotenv
from kafka import KafkaConsumer
from models import ride_deserializer

load_dotenv()

def main():
    redpanda_port = os.getenv('REDPANDA_PORT', '9092')
    consumer = KafkaConsumer(
        'rides',
        bootstrap_servers=[f'localhost:{redpanda_port}'],
        auto_offset_reset='earliest',
        group_id='rides-console',
        value_deserializer=ride_deserializer
    )

    for message in consumer:
        ride = message.value
        print(ride)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print('¡El consumidor fue detenido!')
