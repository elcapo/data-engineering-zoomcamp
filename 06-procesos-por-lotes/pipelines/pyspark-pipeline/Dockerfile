FROM python:3.11-bookworm

ARG SPARK_VERSION=3.5.1
ARG HADOOP_VERSION=3

ENV SPARK_HOME=/opt/spark
ENV PATH=$PATH:$SPARK_HOME/bin:$SPARK_HOME/sbin
ENV JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64

# Instalar Java 17 + utilidades
RUN apt-get update && \
    apt-get install -y openjdk-17-jdk curl procps tini && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Descargar Spark
RUN set -eux; \
    curl -fL https://archive.apache.org/dist/spark/spark-${SPARK_VERSION}/spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION}.tgz -o spark.tgz; \
    tar -xzf spark.tgz -C /opt/; \
    mv /opt/spark-${SPARK_VERSION}-bin-hadoop${HADOOP_VERSION} $SPARK_HOME; \
    rm spark.tgz

# Librerías Python típicas en batch
RUN pip install --no-cache-dir \
    pyspark \
    pandas \
    pyarrow \
    jupyter

WORKDIR /workspace

ENTRYPOINT ["/usr/bin/tini", "--"]