FROM python:3.11-slim

RUN pip install --no-cache-dir \
    beautifulsoup4 \
    "dlt[postgres]"
