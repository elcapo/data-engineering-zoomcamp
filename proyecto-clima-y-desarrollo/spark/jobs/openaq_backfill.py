"""PySpark job: backfill OpenAQ historical measurements from the public S3 dump.

Reads CSV.gz partitions from s3://openaq-data-archive/records/csv.gz/, normalizes
columns to match the Flink streaming schema, writes Parquet to MinIO/GCS, and
upserts into raw.openaq_measurements via a Postgres staging table.

The job is idempotent: re-runs overwrite the same Parquet partitions and the
ON CONFLICT DO NOTHING upsert leaves existing rows untouched.
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path

import psycopg
from pyspark.sql import DataFrame, SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import (
    DoubleType,
    LongType,
    StringType,
    StructField,
    StructType,
    TimestampType,
)

from transforms import (
    assert_safe_token,
    build_input_paths,
    filter_existing_paths,
    load_iso_seed,
    parse_csv_list,
    parse_year_range,
    resolve_column_map,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("openaq_backfill")

OUTPUT_SCHEMA = StructType([
    StructField("location_id",    LongType(),      False),
    StructField("location_name",  StringType(),    True),
    StructField("country_iso",    StringType(),    True),
    StructField("country_iso3",   StringType(),    True),
    StructField("sensor_id",      LongType(),      False),
    StructField("parameter",      StringType(),    False),
    StructField("unit",           StringType(),    True),
    StructField("value",          DoubleType(),    True),
    StructField("datetime_utc",   TimestampType(), False),
    StructField("latitude",       DoubleType(),    True),
    StructField("longitude",      DoubleType(),    True),
    StructField("year",           LongType(),      False),
])


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill OpenAQ measurements from the public S3 dump.")
    parser.add_argument("--locations", required=True,
                        help="Comma-separated OpenAQ location IDs (integers).")
    parser.add_argument("--years", required=True,
                        help="Years to ingest. Accepts '2022', '2020-2023', or '2020,2021,2024'.")
    parser.add_argument("--country-iso", required=True,
                        help="ISO2 country code to tag the rows (e.g., ES). All --locations must be in this country.")
    parser.add_argument("--source-bucket", default="openaq-data-archive",
                        help="S3 bucket of the OpenAQ archive (default: openaq-data-archive).")
    parser.add_argument("--output-bucket",
                        default=os.getenv("STORAGE_BUCKET", "climate"),
                        help="MinIO/GCS bucket for cleansed Parquet (default: $STORAGE_BUCKET or 'climate').")
    parser.add_argument("--output-prefix", default="openaq/cleansed",
                        help="Prefix inside the output bucket (default: openaq/cleansed).")
    parser.add_argument("--iso-seed",
                        default="/opt/spark/seeds/country_iso_codes.csv",
                        help="Path to the ISO2→ISO3 reconciliation CSV (mounted from dbt/seeds).")
    parser.add_argument("--skip-jdbc", action="store_true",
                        help="Skip the Postgres upsert (Parquet only). Useful for cloud-only runs.")
    return parser.parse_args(argv)


def build_spark() -> SparkSession:
    spark = (
        SparkSession.builder
        .appName("openaq-backfill")
        .config("spark.sql.session.timeZone", "UTC")
        .getOrCreate()
    )
    return spark


# OpenAQ S3 dump stores datetimes as ISO 8601 with offset, e.g.
# '2023-01-01T01:00:00-07:00' or '2023-01-01T01:00:00Z'. Spark's default
# to_timestamp expects 'yyyy-MM-dd HH:mm:ss' and silently produces NULL on
# this layout — see https://docs.openaq.org/aws/year-guide for the format.
_DATETIME_FORMAT = "yyyy-MM-dd'T'HH:mm:ssXXX"


def normalize_dataframe(
    raw: DataFrame,
    *,
    country_iso2: str,
    country_iso3: str,
) -> DataFrame:
    """Rename / cast S3 dump columns into the canonical output schema."""
    column_map = resolve_column_map(raw.columns)
    selected = raw.select(
        F.col(column_map["location_id"]).cast(LongType()).alias("location_id"),
        F.col(column_map["location_name"]).cast(StringType()).alias("location_name"),
        F.col(column_map["sensor_id"]).cast(LongType()).alias("sensor_id"),
        F.col(column_map["parameter"]).cast(StringType()).alias("parameter"),
        F.col(column_map["unit"]).cast(StringType()).alias("unit"),
        F.col(column_map["value"]).cast(DoubleType()).alias("value"),
        F.to_timestamp(F.col(column_map["datetime_utc"]), _DATETIME_FORMAT).alias("datetime_utc"),
        F.col(column_map["latitude"]).cast(DoubleType()).alias("latitude"),
        F.col(column_map["longitude"]).cast(DoubleType()).alias("longitude"),
    )
    return (
        selected
        .filter(F.col("location_id").isNotNull())
        .filter(F.col("parameter").isNotNull())
        .filter(F.col("datetime_utc").isNotNull())
        .withColumn("country_iso",  F.lit(country_iso2))
        .withColumn("country_iso3", F.lit(country_iso3))
        .withColumn("year",         F.year("datetime_utc").cast(LongType()))
        .select(*[f.name for f in OUTPUT_SCHEMA.fields])
    )


def write_parquet(df: DataFrame, output_path: str) -> None:
    """Write Parquet partitioned by year + country_iso3 (dynamic overwrite)."""
    logger.info("Writing Parquet to %s ...", output_path)
    (
        df.write
        .mode("overwrite")
        .partitionBy("year", "country_iso3")
        .parquet(output_path)
    )


def upsert_to_postgres(
    df: DataFrame,
    *,
    jdbc_url: str,
    user: str,
    password: str,
    psycopg_dsn: str,
    staging_table: str = "raw._openaq_backfill_staging",
    target_table: str = "raw.openaq_measurements",
) -> int:
    """Stage Spark output in Postgres, then merge with ON CONFLICT DO NOTHING.

    The staging table is dropped on success. Target columns match the existing
    raw.openaq_measurements schema (no country_iso3 column there); we drop the
    derived columns when merging.
    """
    logger.info("Writing %d rows to staging table %s via JDBC ...", df.count(), staging_table)
    staging_df = df.select(
        "location_id", "location_name", "country_iso", "sensor_id",
        "parameter", "unit", "value", "datetime_utc",
        "latitude", "longitude",
    ).withColumn("datetime_local", F.lit(None).cast(StringType()))

    (
        staging_df.write
        .mode("overwrite")
        .option("truncate", "false")
        .format("jdbc")
        .option("url", jdbc_url)
        .option("user", user)
        .option("password", password)
        .option("driver", "org.postgresql.Driver")
        .option("dbtable", staging_table)
        .save()
    )

    insert_sql = f"""
        INSERT INTO {target_table} (
            location_id, location_name, country_iso, sensor_id,
            parameter, unit, value, datetime_utc,
            datetime_local, latitude, longitude
        )
        SELECT
            location_id, location_name, country_iso, sensor_id,
            parameter, unit, value, datetime_utc,
            datetime_local, latitude, longitude
        FROM {staging_table}
        ON CONFLICT (location_id, parameter, datetime_utc) DO NOTHING
    """
    drop_sql = f"DROP TABLE IF EXISTS {staging_table}"

    logger.info("Merging staging → %s with ON CONFLICT DO NOTHING ...", target_table)
    with psycopg.connect(psycopg_dsn) as conn, conn.cursor() as cur:
        cur.execute(insert_sql)
        inserted = cur.rowcount
        cur.execute(drop_sql)
        conn.commit()
    logger.info("Merge complete: %d new rows inserted into %s", inserted, target_table)
    return inserted


def run(args: argparse.Namespace) -> int:
    country_iso2 = assert_safe_token(args.country_iso.upper(), "country-iso")
    output_bucket = assert_safe_token(args.output_bucket, "output-bucket")
    source_bucket = assert_safe_token(args.source_bucket, "source-bucket")
    location_ids = [int(token) for token in parse_csv_list(args.locations)]
    years = parse_year_range(args.years)

    iso_seed = load_iso_seed(Path(args.iso_seed))
    if country_iso2 not in iso_seed:
        raise SystemExit(f"ISO2 '{country_iso2}' not found in seed at {args.iso_seed}")
    country_iso3 = iso_seed[country_iso2]

    input_paths = build_input_paths(source_bucket, location_ids, years)
    logger.info("Built %d candidate S3 path(s): %s", len(input_paths), input_paths[:3])

    spark = build_spark()
    try:
        existing_paths = filter_existing_paths(spark, source_bucket, input_paths)
        skipped = len(input_paths) - len(existing_paths)
        if skipped:
            logger.warning(
                "Skipping %d non-existent (location, year) partition(s); reading %d.",
                skipped, len(existing_paths),
            )
        if not existing_paths:
            logger.warning("No existing partitions to read — backfill is a no-op for this scope.")
            return 0
        raw = spark.read.option("header", "true").option("recursiveFileLookup", "true").csv(existing_paths)
        normalized = normalize_dataframe(raw, country_iso2=country_iso2, country_iso3=country_iso3)
        normalized.cache()
        row_count = normalized.count()
        logger.info("Normalized %d measurement rows", row_count)
        if row_count == 0:
            logger.warning("No rows produced — check --locations / --years / source bucket access")

        output_path = f"s3a://{output_bucket}/{args.output_prefix.strip('/')}/"
        write_parquet(normalized, output_path)

        if args.skip_jdbc:
            logger.info("--skip-jdbc set; not writing to Postgres")
            return row_count

        jdbc_url = os.environ["PG_JDBC_URL"]
        pg_user = os.environ["POSTGRES_USER"]
        pg_pass = os.environ["POSTGRES_PASSWORD"]
        psycopg_dsn = (
            f"host={os.environ.get('POSTGRES_HOST', 'postgres')} "
            f"port={os.environ.get('POSTGRES_PORT', '5432')} "
            f"dbname={os.environ.get('POSTGRES_DB', 'climate')} "
            f"user={pg_user} password={pg_pass}"
        )
        upsert_to_postgres(
            normalized,
            jdbc_url=jdbc_url,
            user=pg_user,
            password=pg_pass,
            psycopg_dsn=psycopg_dsn,
        )
        return row_count
    finally:
        spark.stop()


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    run(args)


if __name__ == "__main__":
    main()
