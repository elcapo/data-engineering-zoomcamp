FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.10.9 /uv /usr/local/bin/uv

WORKDIR /dbt

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY dbt_project.yml profiles.yml ./
COPY seeds/ ./seeds/
COPY macros/ ./macros/
COPY models/ ./models/

ENV DBT_PROFILES_DIR=/dbt
ENV PATH="/dbt/.venv/bin:$PATH"

ENTRYPOINT ["dbt"]
CMD ["seed", "--full-refresh"]
