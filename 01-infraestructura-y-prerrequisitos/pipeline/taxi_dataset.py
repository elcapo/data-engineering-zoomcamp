import os
import gzip
from urllib.request import urlretrieve
import pandas as pd
from sqlalchemy import create_engine

def download_and_extract():
    if os.path.isfile('yellow_tripdata_2021-01.csv'):
        return

    prefix = 'https://github.com/DataTalksClub/nyc-tlc-data/releases/download/yellow/'
    url = prefix + 'yellow_tripdata_2021-01.csv.gz'

    urlretrieve(url, 'yellow_tripdata_2021-01.csv.gz')
    
    with gzip.open('yellow_tripdata_2021-01.csv.gz', 'rb') as f_in:
        with open('yellow_tripdata_2021-01.csv', 'wb') as f_out:
            f_out.writelines(f_in)

def remove_files():
    os.remove('yellow_tripdata_2021-01.csv.gz')
    os.remove('yellow_tripdata_2021-01.csv')

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

def read_header():
    return pd.read_csv(
        'yellow_tripdata_2021-01.csv',
        dtype=get_column_types(),
        parse_dates=get_date_columns(),
        nrows=0,
    )

def create_table_schema(connection_string, table_name):
    df = read_header()
    engine = create_engine(connection_string)
    df.head(0).to_sql(
        name=table_name,
        con=engine,
        if_exists='replace',
        index=False
    )

def iterate_rows(chunksize):
    return pd.read_csv(
        'yellow_tripdata_2021-01.csv',
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
