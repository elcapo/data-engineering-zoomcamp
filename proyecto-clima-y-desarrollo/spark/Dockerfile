FROM bitnami/spark:3.5.4

USER root

RUN install_packages curl

WORKDIR /opt/bitnami/spark/jars
RUN curl -fSL -o hadoop-aws-3.3.4.jar \
        https://repo1.maven.org/maven2/org/apache/hadoop/hadoop-aws/3.3.4/hadoop-aws-3.3.4.jar && \
    curl -fSL -o aws-java-sdk-bundle-1.12.262.jar \
        https://repo1.maven.org/maven2/com/amazonaws/aws-java-sdk-bundle/1.12.262/aws-java-sdk-bundle-1.12.262.jar && \
    curl -fSL -o postgresql-42.7.3.jar \
        https://jdbc.postgresql.org/download/postgresql-42.7.3.jar

RUN pip3 install --no-cache-dir 'psycopg[binary]==3.2.3'

WORKDIR /opt/spark
COPY jobs/ ./jobs/
COPY submit-job.sh ./submit-job.sh
RUN chmod +x ./submit-job.sh

USER 1001

ENTRYPOINT ["/opt/spark/submit-job.sh"]
CMD ["--help"]
