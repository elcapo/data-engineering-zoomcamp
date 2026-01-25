import os
import gzip
from urllib.request import urlretrieve
import pandas as pd
from sqlalchemy import create_engine

def download_and_extract(year, month):
    if os.path.isfile(f'yellow_tripdata_{year}-{month:02d}.csv'):
        return

    prefix = 'https://github.com/DataTalksClub/nyc-tlc-data/releases/download/yellow/'
    url = prefix + f'yellow_tripdata_{year}-{month:02d}.csv.gz'

    urlretrieve(url, f'yellow_tripdata_{year}-{month:02d}.csv.gz')
    
    with gzip.open(f'yellow_tripdata_{year}-{month:02d}.csv.gz', 'rb') as f_in:
        with open(f'yellow_tripdata_{year}-{month:02d}.csv', 'wb') as f_out:
            f_out.writelines(f_in)

def remove_files(year, month):
    os.remove(f'yellow_tripdata_{year}-{month:02d}.csv.gz')
    os.remove(f'yellow_tripdata_{year}-{month:02d}.csv')

def get_column_types():
    return {
        'VendorID': 'Int64',
        'passenger_count': 'Int64',
        'trip_distance': 'float64',
        'RatecodeID': 'Int64',
        'store_and_fwd_flag': 'string',
        'PULocationID': 'Int64',
        'DOLocationID': 'Int64',
        'payment_type': 'Int64',
        'fare_amount': 'float64',
        'extra': 'float64',
        'mta_tax': 'float64',
        'tip_amount': 'float64',
        'tolls_amount': 'float64',
        'improvement_surcharge': 'float64',
        'total_amount': 'float64',
        'congestion_surcharge': 'float64'
    }

def get_date_columns():
    return [
        'tpep_pickup_datetime',
        'tpep_dropoff_datetime'
    ]

def read_header(year, month):
    return pd.read_csv(
        f'yellow_tripdata_{year}-{month:02d}.csv',
        dtype=get_column_types(),
        parse_dates=get_date_columns(),
        nrows=0,
    )

def create_table_schema(connection_string, table_name, year, month):
    df = read_header(year, month)
    engine = create_engine(connection_string)

    if engine.dialect.has_table(engine.connect(), table_name):
        return

    df.head(0).to_sql(
        name=table_name,
        con=engine,
        index=False
    )

def iterate_rows(chunksize, year, month):
    return pd.read_csv(
        f'yellow_tripdata_{year}-{month:02d}.csv',
        dtype=get_column_types(),
        parse_dates=get_date_columns(),
        iterator=True,
        chunksize=chunksize,
    )

def insert_chunk(chunk, connection_string, table_name, chunk_id):
    try:
        engine = create_engine(connection_string)
        chunk.to_sql(
            name=table_name,
            con=engine,
            if_exists='append',
            index=False
        )
        return chunk_id
    except:
        raise
