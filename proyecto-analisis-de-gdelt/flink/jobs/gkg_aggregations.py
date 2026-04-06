"""Flink streaming job that consumes GKG records from Redpanda,
explodes the semicolon-delimited themes, and writes avg tone per theme
to PostgreSQL."""

from pyflink.common import Row
from pyflink.table import DataTypes, EnvironmentSettings, TableEnvironment
from pyflink.table.udf import udtf

from sql_loader import load_config, load_sql


@udtf(result_types=[DataTypes.STRING()])
def split_themes(themes_str: str):
    """Split semicolon-delimited themes into individual rows."""
    if themes_str:
        for theme in themes_str.split(";"):
            t = theme.strip()
            if t:
                yield Row(t)


def main():
    cfg = load_config()
    t_env = TableEnvironment.create(EnvironmentSettings.in_streaming_mode())
    t_env.get_config().set("execution.checkpointing.interval", "60s")
    t_env.get_config().set("table.exec.source.idle-timeout", "5s")
    t_env.create_temporary_function("split_themes", split_themes)

    t_env.execute_sql(load_sql("source_kafka_gkg.sql", cfg))
    t_env.execute_sql(load_sql("sink_tone_by_theme.sql", cfg))
    t_env.execute_sql(load_sql("view_exploded_gkg.sql"))
    t_env.execute_sql(load_sql("insert_tone_by_theme.sql"))


if __name__ == "__main__":
    main()
