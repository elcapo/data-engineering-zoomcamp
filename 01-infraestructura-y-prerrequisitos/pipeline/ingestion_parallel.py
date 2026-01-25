import os
from concurrent.futures import ThreadPoolExecutor
import click
from tqdm.auto import tqdm
from taxi_dataset import *

def get_available_workers():
    return len(os.sched_getaffinity(0))

@click.command()
@click.option('--year', default=2021, type=int, help='Year of the data')
@click.option('--month', default=1, type=int, help='Month of the data')
@click.option('--chunksize', default=100000, type=int, help='Chunk size for reading CSV')
@click.option('--target-table', default='yellow_taxi_data', help='Target table name')
@click.option('--pg-host', default='localhost', help='PostgreSQL host')
@click.option('--pg-user', default='root', help='PostgreSQL user')
@click.option('--pg-password', default='root', help='PostgreSQL password')
@click.option('--pg-port', default=5432, type=int, help='PostgreSQL port')
@click.option('--pg-database', default='taxi', help='PostgreSQL database name')
def ingest(year, month, chunksize, target_table, pg_host, pg_user, pg_password, pg_port, pg_database):
    download_and_extract(year, month)

    connection_string = f'postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}'
    create_table_schema(connection_string, target_table, year, month)

    max_workers = get_available_workers()
    print(f"{max_workers} workers are available")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {}

        for index, chunk in tqdm(enumerate(iterate_rows(chunksize, year, month))):
            future = executor.submit(
                insert_chunk, 
                chunk, 
                connection_string, 
                target_table, 
                index
            )
            futures[future] = index
    
    remove_files(year, month)

if __name__ == "__main__":
    ingest()
