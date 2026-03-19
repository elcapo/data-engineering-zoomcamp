FROM python:3.11-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

COPY python/issue-parser /app/python/issue-parser
COPY python/archive-parser /app/python/archive-parser

# dlt[postgres] se declara como dependencia de los flujos que lo necesitan;
# lo instalamos aquí para que esté disponible en todos los contenedores.
RUN uv pip install --system --no-cache \
    "dlt[postgres]" \
    /app/python/issue-parser \
    /app/python/archive-parser
