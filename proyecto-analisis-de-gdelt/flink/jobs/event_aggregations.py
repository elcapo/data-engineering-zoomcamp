"""Flink streaming jobs that consume events and mentions from Redpanda
and write windowed aggregations to PostgreSQL."""

from pyflink.table import EnvironmentSettings, TableEnvironment

from sql_loader import load_config, load_sql


def main():
    cfg = load_config()
    t_env = TableEnvironment.create(EnvironmentSettings.in_streaming_mode())
    t_env.get_config().set("execution.checkpointing.interval", "60s")

    # Kafka sources

    t_env.execute_sql(load_sql("source_kafka_events.sql", cfg))
    t_env.execute_sql(load_sql("source_kafka_mentions.sql", cfg))

    # JDBC sinks

    t_env.execute_sql(load_sql("sink_event_counts_by_country.sql", cfg))
    t_env.execute_sql(load_sql("sink_conflict_trend.sql", cfg))
    t_env.execute_sql(load_sql("sink_top_actors.sql", cfg))
    t_env.execute_sql(load_sql("sink_media_attention.sql", cfg))

    # Aggregation queries via StatementSet

    stmt_set = t_env.create_statement_set()
    stmt_set.add_insert_sql(load_sql("insert_event_counts_by_country.sql"))
    stmt_set.add_insert_sql(load_sql("insert_conflict_trend.sql"))
    stmt_set.add_insert_sql(load_sql("insert_top_actors.sql"))
    stmt_set.add_insert_sql(load_sql("insert_media_attention.sql"))
    stmt_set.execute()


if __name__ == "__main__":
    main()
