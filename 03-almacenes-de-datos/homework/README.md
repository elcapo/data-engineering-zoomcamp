# Module 3 Homework: Data Warehousing & BigQuery

## Data

For this homework we will be using the Yellow Taxi Trip Records for **January 2024 - June 2024** (not the entire year of data).

Parquet Files are available from the New York City Taxi Data found [here](https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page).

## Loading the data

You can use the following scripts to load the data into your GCS bucket:

- Python script: [load_yellow_taxi_data.py](./load_yellow_taxi_data.py)
- Jupyter notebook with DLT: [DLT_upload_to_GCP.ipynb](./DLT_upload_to_GCP.ipynb)

If you want to use the script, first download your credentials JSON file as `service-account.json` and then run:

```bash
uv run load_yellow_taxi_data.py
```

You will need to generate a Service Account with GCS Admin privileges or be authenticated with the Google SDK, and update the bucket name in the script.

If you are using orchestration tools such as Kestra, Mage, Airflow, or Prefect, do not load the data into BigQuery using the orchestrator.

Make sure that all 6 files show in your GCS bucket before beginning.

> [!NOTE]
> You will need to use the PARQUET option when creating an external table.

## BigQuery Setup

> Create an external table using the Yellow Taxi Trip Records.

```sql
CREATE OR REPLACE EXTERNAL TABLE `zoomcamp.yellow_tripdata_parquet_ext`
OPTIONS (
  format = 'Parquet',
  uris = ['gs://newyork-taxi/yellow_tripdata_*.parquet']
);
```

> Create a regular, materialized table in BigQuery using the Yellow Taxi Trip Records. Do not partition or cluster this table.

```sql
CREATE OR REPLACE TABLE zoomcamp.yellow_tripdata_parquet
AS
SELECT * FROM zoomcamp.yellow_tripdata_parquet_ext;
```

## Question 1. Counting records

> What is count of records for the 2024 Yellow Taxi Data?

```sql
SELECT COUNT(*) FROM zoomcamp.yellow_tripdata_parquet
```

- **20,332,093**

## Question 2. Data read estimation

> Write a query to count the distinct number of PULocationIDs for the entire dataset on both the tables.

```sql
/* External table */
SELECT DISTINCT PULocationID FROM zoomcamp.yellow_tripdata_parquet_ext

/* Materialized table */
SELECT DISTINCT PULocationID FROM zoomcamp.yellow_tripdata_parquet
```

> What is the **estimated amount** of data that will be read when this query is executed on the External Table and the Table?

- **0 MB for the External Table and 155.12 MB for the Materialized Table**

## Question 3. Understanding columnar storage

> Write a query to retrieve the PULocationID from the table (not the external table) in BigQuery. Now write a query to retrieve the PULocationID and DOLocationID on the same table.

```sql
/* 155.12 MB */
SELECT PULocationID FROM zoomcamp.yellow_tripdata_parquet

/* 310.24 MB */
SELECT PULocationID, DOLocationID FROM zoomcamp.yellow_tripdata_parquet
```

> Why are the estimated number of Bytes different?

- **BigQuery is a columnar database, and it only scans the specific columns requested in the query. Querying two columns (PULocationID, DOLocationID) requires reading more data than querying one column (PULocationID), leading to a higher estimated number of bytes processed.**

## Question 4. Counting zero fare trips

> How many records have a fare_amount of 0?

```sql
SELECT COUNT(*) FROM zoomcamp.yellow_tripdata_parquet WHERE fare_amount = 0
```

- **8,333**

## Question 5. Partitioning and clustering

> What is the best strategy to make an optimized table in Big Query if your query will always filter based on tpep_dropoff_datetime and order the results by VendorID?

- **Partition by tpep_dropoff_datetime and Cluster on VendorID**

> Create a new table with this strategy.

```sql
CREATE OR REPLACE TABLE zoomcamp.yellow_tripdata_parquet_partitioned_clustered
PARTITION BY DATE(tpep_dropoff_datetime)
CLUSTER BY VendorID AS
SELECT * FROM zoomcamp.yellow_tripdata_parquet;
```

## Question 6. Partition benefits

> Write a query to retrieve the distinct VendorIDs between tpep_dropoff_datetime 2024-03-01 and 2024-03-15 (inclusive).

```sql
/* Materialized table */
SELECT DISTINCT VendorID
FROM zoomcamp.yellow_tripdata_parquet
WHERE tpep_dropoff_datetime BETWEEN '2024-03-01' AND '2024-03-15'

/* Partitioned and clustered table */
SELECT DISTINCT VendorID
FROM zoomcamp.yellow_tripdata_parquet_partitioned_clustered
WHERE tpep_dropoff_datetime BETWEEN '2024-03-01' AND '2024-03-15'
```

> Use the materialized table you created earlier in your from clause and note the estimated bytes.

- **310.24 MB**

> Now change the table in the from clause to the partitioned table you created for question 5 and note the estimated bytes processed.

- **26.84 MB**

> What are these values? Choose the answer which most closely matches.

- **310.24 MB for non-partitioned table and 26.84 MB for the partitioned table**

## Question 7. External table storage

> Where is the data stored in the External Table you created?

- **GCP Bucket**

## Question 8. Clustering best practices

> It is best practice in Big Query to always cluster your data:

- **True**, but with good criteria.

## Question 9. Understanding table scans

> No Points: Write a `SELECT count(*)` query FROM the materialized table you created.

```sql
SELECT COUNT(*)
FROM zoomcamp.yellow_tripdata_parquet
```

> How many bytes does it estimate will be read? Why?

The estimate number of bytes is 0 B and the reason is that with materialized tables, BigQuery already maintains the count of records as part of the table metadata. If we added a filter, we'd obtain an amout of bytes different than zero.

For instance, the estimate of processed bytes for this other query is 155.12 MB.

```sql
SELECT COUNT(*)
FROM zoomcamp.yellow_tripdata_parquet
WHERE VendorID = 2
```

## Submitting the solutions

Form for submitting: https://courses.datatalks.club/de-zoomcamp-2026/homework/hw3
