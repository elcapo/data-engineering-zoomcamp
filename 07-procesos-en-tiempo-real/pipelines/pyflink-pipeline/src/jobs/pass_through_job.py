from pyflink.datastream import StreamExecutionEnvironment
from pyflink.table import EnvironmentSettings, StreamTableEnvironment

def create_events_source_kafka(t_env):
    t_env.execute_sql("""
        CREATE TABLE events (
            PULocationID INTEGER,
            DOLocationID INTEGER,
            trip_distance DOUBLE,
            total_amount DOUBLE,
            tpep_pickup_datetime BIGINT
        ) WITH (
            'connector' = 'kafka',
            'properties.bootstrap.servers' = 'redpanda:29092',
            'topic' = 'rides',
            'scan.startup.mode' = 'latest-offset',
            'format' = 'json'
        )
    """)
    return 'events'

def create_processed_events_sink_postgres(t_env):
    t_env.execute_sql("""
        CREATE TABLE processed_events (
            PULocationID INTEGER,
            DOLocationID INTEGER,
            trip_distance DOUBLE,
            total_amount DOUBLE,
            pickup_datetime TIMESTAMP
        ) WITH (
            'connector' = 'jdbc',
            'url' = 'jdbc:postgresql://postgres:5432/postgres',
            'table-name' = 'processed_events',
            'username' = 'postgres',
            'password' = 'postgres',
            'driver' = 'org.postgresql.Driver'
        )
    """)
    return 'processed_events'

def log_processing():
    env = StreamExecutionEnvironment.get_execution_environment()

    # Checkpoint cada 10 segundos
    env.enable_checkpointing(10 * 1000)

    t_env = StreamTableEnvironment.create(
        env, EnvironmentSettings.new_instance().in_streaming_mode().build()
    )

    source = create_events_source_kafka(t_env)
    sink = create_processed_events_sink_postgres(t_env)

    t_env.execute_sql(f"""
        INSERT INTO {sink}
        SELECT
            PULocationID,
            DOLocationID,
            trip_distance,
            total_amount,
            TO_TIMESTAMP_LTZ(tpep_pickup_datetime, 3) AS pickup_datetime
        FROM {source}
    """).wait()

if __name__ == '__main__':
    log_processing()
