FROM flink:1.20.3

RUN apt-get update && \
    apt-get install -y python3 python3-pip && \
    ln -s /usr/bin/python3 /usr/bin/python && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir apache-flink==1.20.3

RUN cd /opt/flink/lib && \
    curl -fSL https://repo1.maven.org/maven2/org/apache/flink/flink-sql-connector-kafka/3.3.0-1.20/flink-sql-connector-kafka-3.3.0-1.20.jar \
         -o flink-sql-connector-kafka-3.3.0-1.20.jar && \
    curl -fSL https://repo1.maven.org/maven2/org/apache/flink/flink-connector-jdbc/3.3.0-1.20/flink-connector-jdbc-3.3.0-1.20.jar \
         -o flink-connector-jdbc-3.3.0-1.20.jar && \
    curl -fSL https://jdbc.postgresql.org/download/postgresql-42.7.3.jar \
         -o postgresql-42.7.3.jar

COPY sql/ /opt/flink/sql/
COPY jobs/ /opt/flink/jobs/
COPY submit-jobs.sh /opt/flink/submit-jobs.sh
RUN chmod +x /opt/flink/submit-jobs.sh
