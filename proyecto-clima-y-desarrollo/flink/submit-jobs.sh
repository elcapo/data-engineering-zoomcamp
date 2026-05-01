#!/bin/bash
set -e

JOBMANAGER_URL="http://flink-jobmanager:8081"

echo "Waiting for Flink JobManager to be ready..."
until curl -sf "${JOBMANAGER_URL}/overview" > /dev/null 2>&1; do
    echo "  JobManager not ready yet, retrying in 5s..."
    sleep 5
done
echo "JobManager is ready."

echo "Submitting openaq_streaming job..."
flink run -m flink-jobmanager:8081 -py /opt/flink/jobs/openaq_streaming.py -d

echo "All jobs submitted successfully."
