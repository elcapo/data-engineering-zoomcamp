FROM python:3.11-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

COPY python/archive-parser /app/python/archive-parser
COPY python/year-parser /app/python/year-parser
COPY python/issue-parser /app/python/issue-parser
COPY python/document-parser /app/python/document-parser

# dlt[postgres] se declara como dependencia de los flujos que lo necesitan;
# lo instalamos aquí para que esté disponible en todos los contenedores.
RUN uv pip install --system --no-cache \
    "dlt[postgres]" \
    minio \
    /app/python/archive-parser \
    /app/python/year-parser \
    /app/python/issue-parser \
    /app/python/document-parser
