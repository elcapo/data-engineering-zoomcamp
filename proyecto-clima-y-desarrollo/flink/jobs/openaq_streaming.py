"""Flink streaming job: consume openaq.measurements, mirror to Postgres,
and emit hourly + daily tumbling-window aggregations by (country, parameter)."""

from pyflink.table import EnvironmentSettings, TableEnvironment

from sql_loader import load_config, load_sql


def main() -> None:
    cfg = load_config()
    t_env = TableEnvironment.create(EnvironmentSettings.in_streaming_mode())
    t_env.get_config().set("execution.checkpointing.interval", "60s")

    # Source

    t_env.execute_sql(load_sql("source_kafka_openaq.sql", cfg))

    # JDBC sinks

    t_env.execute_sql(load_sql("sink_openaq_measurements.sql", cfg))
    t_env.execute_sql(load_sql("sink_openaq_hourly.sql", cfg))
    t_env.execute_sql(load_sql("sink_openaq_daily.sql", cfg))

    # Insert statements via StatementSet so they share the same DAG

    stmt_set = t_env.create_statement_set()
    stmt_set.add_insert_sql(load_sql("insert_openaq_measurements.sql"))
    stmt_set.add_insert_sql(load_sql("insert_openaq_hourly.sql"))
    stmt_set.add_insert_sql(load_sql("insert_openaq_daily.sql"))
    stmt_set.execute()


if __name__ == "__main__":
    main()
