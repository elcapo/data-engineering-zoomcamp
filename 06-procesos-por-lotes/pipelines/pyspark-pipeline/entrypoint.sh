#!/usr/bin/env bash
set -e

export PYTHONPATH="$SPARK_HOME/python:$(ls $SPARK_HOME/python/lib/py4j*.zip)"

exec "$@"