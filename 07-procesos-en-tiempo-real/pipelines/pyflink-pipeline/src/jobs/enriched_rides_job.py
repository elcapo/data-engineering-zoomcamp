from pyflink.datastream import StreamExecutionEnvironment
from pyflink.table import EnvironmentSettings, StreamTableEnvironment


def create_rides_source(t_env):
    t_env.execute_sql("""
        CREATE TABLE rides (
            PULocationID INTEGER,
            DOLocationID INTEGER,
            trip_distance DOUBLE,
            total_amount DOUBLE,
            tpep_pickup_datetime BIGINT,
            proc_time AS PROCTIME()
        ) WITH (
            'connector' = 'kafka',
            'properties.bootstrap.servers' = 'redpanda:29092',
            'topic' = 'rides',
            'scan.startup.mode' = 'latest-offset',
            'format' = 'json'
        )
    """)
    return 'rides'


def create_zones_lookup(t_env):
    t_env.execute_sql("""
        CREATE TABLE zones (
            location_id INTEGER,
            borough VARCHAR,
            zone VARCHAR,
            PRIMARY KEY (location_id) NOT ENFORCED
        ) WITH (
            'connector' = 'jdbc',
            'url' = 'jdbc:postgresql://postgres:5432/postgres',
            'table-name' = 'zones',
            'username' = 'postgres',
            'password' = 'postgres',
            'driver' = 'org.postgresql.Driver',
            'lookup.cache.max-rows' = '265',
            'lookup.cache.ttl' = '1 hour'
        )
    """)
    return 'zones'


def create_enriched_sink(t_env):
    t_env.execute_sql("""
        CREATE TABLE enriched_rides (
            PULocationID INTEGER,
            pickup_zone VARCHAR,
            DOLocationID INTEGER,
            dropoff_zone VARCHAR,
            trip_distance DOUBLE,
            total_amount DOUBLE,
            pickup_datetime TIMESTAMP
        ) WITH (
            'connector' = 'jdbc',
            'url' = 'jdbc:postgresql://postgres:5432/postgres',
            'table-name' = 'enriched_rides',
            'username' = 'postgres',
            'password' = 'postgres',
            'driver' = 'org.postgresql.Driver'
        )
    """)
    return 'enriched_rides'


def enrich_rides():
    env = StreamExecutionEnvironment.get_execution_environment()
    env.enable_checkpointing(10 * 1000)

    t_env = StreamTableEnvironment.create(
        env, EnvironmentSettings.new_instance().in_streaming_mode().build()
    )

    rides  = create_rides_source(t_env)
    zones  = create_zones_lookup(t_env)
    sink   = create_enriched_sink(t_env)

    t_env.execute_sql(f"""
        INSERT INTO {sink}
        SELECT
            r.PULocationID,
            zpu.zone AS pickup_zone,
            r.DOLocationID,
            zdo.zone AS dropoff_zone,
            r.trip_distance,
            r.total_amount,
            TO_TIMESTAMP_LTZ(r.tpep_pickup_datetime, 3) AS pickup_datetime
        FROM {rides} AS r
        JOIN {zones} FOR SYSTEM_TIME AS OF r.proc_time AS zpu
            ON r.PULocationID = zpu.location_id
        JOIN {zones} FOR SYSTEM_TIME AS OF r.proc_time AS zdo
            ON r.DOLocationID = zdo.location_id
    """).wait()


if __name__ == '__main__':
    enrich_rides()