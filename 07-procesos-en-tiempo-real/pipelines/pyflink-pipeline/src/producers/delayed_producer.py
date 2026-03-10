import dataclasses
import json
import random
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from kafka import KafkaProducer

sys.path.insert(0, str(Path(__file__).parent.parent))
from models import Ride, random_ride, ride_serializer

def generate_random_ride(delay_probability=0.2):
    if random.random() < delay_probability:
        delay = random.randint(3, 10)
        ride = random_ride(delay)
        timestamp = datetime.fromtimestamp(ride.tpep_pickup_datetime / 1000, tz=timezone.utc)
        print(f"RETRASADO ({delay}s): pickup location={ride.PULocationID} timestamp={timestamp:%H:%M:%S}")
    else:
        ride = random_ride()
        timestamp = datetime.fromtimestamp(ride.tpep_pickup_datetime / 1000, tz=timezone.utc)
        print(f"A TIEMPO: pickup location={ride.PULocationID} timestamp={timestamp:%H:%M:%S}")

    return ride

if __name__ == "__main__":
    producer = KafkaProducer(
        bootstrap_servers=['localhost:9092'],
        value_serializer=ride_serializer,
    )

    count = 0

    print("Enviando eventos...")
    print("> Pulsa Ctrl+C para parar\n")

    try:
        while True:
            ride = generate_random_ride()
            producer.send('rides', value=ride)
            count += 1
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\n¡El productor fue detenido!")
        print(f"Se enviaron {count} eventos")

    producer.flush()
