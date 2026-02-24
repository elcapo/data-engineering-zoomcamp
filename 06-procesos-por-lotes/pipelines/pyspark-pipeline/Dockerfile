FROM python:3.11-bookworm

ARG SPARK_VERSION=3.5.8
ARG HADOOP_VERSION=3

ENV SPARK_HOME=/opt/spark
ENV PATH=$PATH:$SPARK_HOME/bin:$SPARK_HOME/sbin
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
ENV PYSPARK_PYTHON=python3
ENV PYSPARK_DRIVER_PYTHON=python3

# Instalar Java 17 + utilidades
RUN apt-get update && \
    apt-get install -y openjdk-17-jdk curl procps tini && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Descargar Spark
RUN set -eux; \
    url_dl="https://dlcdn.apache.org/spark/spark-${SPARK_VERSION}/spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz"; \
    url_archive="https://archive.apache.org/dist/spark/spark-${SPARK_VERSION}/spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz"; \
    (echo "Intentando descargar desde dlcdn..." && curl -fL "$url_dl" -o spark.tgz) \
    || (echo "dlcdn no disponible, usando archive..." && curl -fL "$url_archive" -o spark.tgz); \
    tar -xzf spark.tgz -C /opt/; \
    mv /opt/spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION} "$SPARK_HOME"; \
    rm spark.tgz

# Librerías Python típicas en batch
RUN pip install --no-cache-dir \
    pandas \
    pyarrow \
    jupyter

WORKDIR /workspace

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/usr/bin/tini", "--", "/entrypoint.sh"]
