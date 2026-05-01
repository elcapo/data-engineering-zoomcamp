#!/bin/bash
# Wrapper around spark-submit for the OpenAQ S3 backfill job.
# Per-bucket S3A configuration: anonymous credentials for the public OpenAQ
# archive in us-east-1, MinIO credentials for the local "climate" bucket.

set -euo pipefail

SPARK_MASTER="${SPARK_MASTER:-local[*]}"
STORAGE_BUCKET="${STORAGE_BUCKET:-climate}"
STORAGE_ENDPOINT="${STORAGE_ENDPOINT:-http://minio:9000}"
STORAGE_ACCESS_KEY="${STORAGE_ACCESS_KEY:-${MINIO_ROOT_USER:-minio}}"
STORAGE_SECRET_KEY="${STORAGE_SECRET_KEY:-${MINIO_ROOT_PASSWORD:-minioadmin}}"

exec /opt/bitnami/spark/bin/spark-submit \
    --master "${SPARK_MASTER}" \
    --conf "spark.hadoop.fs.s3a.bucket.openaq-data-archive.aws.credentials.provider=org.apache.hadoop.fs.s3a.AnonymousAWSCredentialsProvider" \
    --conf "spark.hadoop.fs.s3a.bucket.openaq-data-archive.endpoint=s3.us-east-1.amazonaws.com" \
    --conf "spark.hadoop.fs.s3a.bucket.${STORAGE_BUCKET}.endpoint=${STORAGE_ENDPOINT}" \
    --conf "spark.hadoop.fs.s3a.bucket.${STORAGE_BUCKET}.access.key=${STORAGE_ACCESS_KEY}" \
    --conf "spark.hadoop.fs.s3a.bucket.${STORAGE_BUCKET}.secret.key=${STORAGE_SECRET_KEY}" \
    --conf "spark.hadoop.fs.s3a.bucket.${STORAGE_BUCKET}.path.style.access=true" \
    --conf "spark.hadoop.fs.s3a.bucket.${STORAGE_BUCKET}.connection.ssl.enabled=false" \
    --conf "spark.sql.sources.partitionOverwriteMode=dynamic" \
    /opt/spark/jobs/openaq_backfill.py "$@"
