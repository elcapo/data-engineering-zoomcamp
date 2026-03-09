FROM flink:2.2.0-scala_2.12-java17

# Instalar uv para gestionar Python y dependencias
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/

WORKDIR /opt/pyflink
COPY pyproject.flink.toml pyproject.toml
RUN uv python install 3.12 && uv sync
ENV PATH="/opt/pyflink/.venv/bin:$PATH"

# Descargar los conectores JAR necesarios
WORKDIR /opt/flink/lib
RUN wget https://repo.maven.apache.org/maven2/org/apache/flink/flink-json/2.2.0/flink-json-2.2.0.jar; \
    wget .../flink-sql-connector-kafka-4.0.1-2.0.jar; \
    wget .../flink-connector-jdbc-core-4.0.0-2.0.jar; \
    wget .../flink-connector-jdbc-postgres-4.0.0-2.0.jar; \
    wget .../postgresql-42.7.10.jar

COPY flink-config.yaml /opt/flink/conf/config.yaml
