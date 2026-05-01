FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.10.9 /uv /usr/local/bin/uv

WORKDIR /dbt

COPY pyproject.toml ./
RUN uv pip install --system .

COPY dbt_project.yml profiles.yml packages.yml ./
COPY macros/ ./macros/
COPY models/ ./models/
COPY seeds/ ./seeds/

ENV DBT_PROFILES_DIR=/dbt

RUN dbt deps

ENTRYPOINT ["dbt"]
CMD ["run-operation", "create_raw_schema"]
