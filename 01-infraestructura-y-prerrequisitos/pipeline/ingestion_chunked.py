from tqdm.auto import tqdm
from taxi_dataset import *

def ingest(chunksize):
    download_and_extract()

    connection_string = 'postgresql://root:1234@localhost:5434/newyork_taxi'
    target_table = 'yellow_taxi_data'

    first = True
    for index, df_chunk in tqdm(enumerate(iterate_rows(chunksize=chunksize))):
        if first:
            create_table_schema(connection_string, target_table)
            first = False

        insert_chunk(df_chunk, connection_string, target_table, index)
    
    remove_files()

if __name__ == "__main__":
    # chunksize: 100000 => 7m 41s
    ingest(chunksize=100000)
