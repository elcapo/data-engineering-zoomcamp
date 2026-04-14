#!/bin/bash
set -e

JOBMANAGER_URL="http://flink-jobmanager:8081"

echo "Waiting for Flink JobManager to be ready..."
until curl -sf "${JOBMANAGER_URL}/overview" > /dev/null 2>&1; do
    echo "  JobManager not ready yet, retrying in 5s..."
    sleep 5
done
echo "JobManager is ready."

echo "Submitting raw_ingest job..."
flink run -m flink-jobmanager:8081 -py /opt/flink/jobs/raw_ingest.py -d

echo "Submitting event_aggregations job..."
flink run -m flink-jobmanager:8081 -py /opt/flink/jobs/event_aggregations.py -d

echo "Submitting gkg_aggregations job..."
flink run -m flink-jobmanager:8081 -py /opt/flink/jobs/gkg_aggregations.py -d

echo "All jobs submitted successfully."
