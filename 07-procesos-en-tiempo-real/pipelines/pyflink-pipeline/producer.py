import os
import time
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from kafka import KafkaProducer
from models import ride_from_row, ride_serializer

load_dotenv()

def load_producer():
    redpanda_port = os.getenv('REDPANDA_PORT', '9092')
    producer = KafkaProducer(
        bootstrap_servers=[f'localhost:{redpanda_port}'],
        value_serializer=ride_serializer
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
        print(ride)
        producer.send(topic_name, value=ride)
        time.sleep(0.01)

if __name__ == "__main__":
    producer, dataframe = load_producer()
    print('Productor iniciado. Enviando datos...')

    try:
        main(producer, dataframe)
        print('¡Todos los datos fueron enviados con éxito!')
    except KeyboardInterrupt:
        print('¡El productor fue detenido!')

    producer.flush()
