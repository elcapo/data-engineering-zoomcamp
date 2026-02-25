FROM apache/spark:3.5.8-scala2.12-java17-python3-ubuntu

USER root

# Librerías Python típicas en batch
RUN pip install --no-cache-dir \
    pandas \
    pyarrow \
    jupyter

WORKDIR /workspace

# Configurar PYTHONPATH para que pyspark sea importable desde Jupyter
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
