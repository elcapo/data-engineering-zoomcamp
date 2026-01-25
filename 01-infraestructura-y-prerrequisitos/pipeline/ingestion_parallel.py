import os
from concurrent.futures import ThreadPoolExecutor
from tqdm.auto import tqdm
from taxi_dataset import *

def get_available_workers():
    return len(os.sched_getaffinity(0))

def ingest(chunksize):
    download_and_extract()

    connection_string = 'postgresql://root:1234@localhost:5434/newyork_taxi'
    target_table = 'yellow_taxi_data'

    create_table_schema(connection_string, target_table)

    max_workers = get_available_workers()
    print(f"{max_workers} workers are available")

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {}

        for index, chunk in tqdm(enumerate(iterate_rows(chunksize=chunksize))):
            future = executor.submit(
                insert_chunk, 
                chunk, 
                connection_string, 
                target_table, 
                index
            )
            futures[future] = index
    
    remove_files()

if __name__ == "__main__":
    # chunksize: 100000, max_workers: 8 =>
    ingest(chunksize=100000)
