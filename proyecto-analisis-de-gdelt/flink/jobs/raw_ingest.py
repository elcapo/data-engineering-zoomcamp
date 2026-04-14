"""Flink streaming job that persists raw events, mentions, and GKG
records from Redpanda into PostgreSQL without transformations."""

from pyflink.table import EnvironmentSettings, TableEnvironment

from sql_loader import load_config, load_sql


def main():
    cfg = load_config()
    t_env = TableEnvironment.create(EnvironmentSettings.in_streaming_mode())
    t_env.get_config().set("execution.checkpointing.interval", "60s")

    # Kafka sources

    t_env.execute_sql(load_sql("source_kafka_events_raw.sql", cfg))
    t_env.execute_sql(load_sql("source_kafka_mentions_raw.sql", cfg))
    t_env.execute_sql(load_sql("source_kafka_gkg_raw.sql", cfg))

    # JDBC sinks

    t_env.execute_sql(load_sql("sink_events.sql", cfg))
    t_env.execute_sql(load_sql("sink_mentions.sql", cfg))
    t_env.execute_sql(load_sql("sink_gkg.sql", cfg))

    # Passthrough inserts via StatementSet

    stmt_set = t_env.create_statement_set()
    stmt_set.add_insert_sql(load_sql("insert_events.sql"))
    stmt_set.add_insert_sql(load_sql("insert_mentions.sql"))
    stmt_set.add_insert_sql(load_sql("insert_gkg.sql"))
    stmt_set.execute()


if __name__ == "__main__":
    main()
