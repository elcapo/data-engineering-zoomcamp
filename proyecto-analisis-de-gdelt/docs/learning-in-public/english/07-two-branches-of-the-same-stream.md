Data is now flowing into Redpanda every 15 minutes in a continuous stream. The question is what to do with it. One tempting option is a serial pipeline: first a job that stores the raw data, and then another that reads those already-stored tables and computes the aggregations. But that couples the two steps and forces the second to wait for the first.

The decision was another: two branches in parallel hanging off the same Redpanda stream. Each one does its job without noticing the other.

1. **A branch that stores the data as-is.**

It consumes the three topics (events, mentions and GKG) and writes them to Postgres untransformed. No filtering, grouping or calculation. Its sole purpose is to preserve the full history, row by row, in tables we can later query by hand, audit or reprocess if we change our minds about what we want to compute.

2. **Branches that group by time windows.**

Other jobs read the same three topics and group them by time windows, writing the already-computed result to Postgres. Things like "how many events were there in each country in the last 15 minutes" or "what is the average tone per theme and hour" are, in practice, pre-computed views that an analytics dashboard can draw instantly without having to scan millions of raw rows.

The fact that both branches spring from the same source, and not one from the other, has an important practical consequence: if the storage job gets stuck or I stop it for maintenance, the aggregations keep reaching the dashboards; conversely, if I miscompute an aggregation and have to redo it, the raw data was never touched.

Postgres ends up with two families of tables living in the same place: the "raw" ones, which grow without stopping, and the aggregated ones, which are rewritten as windows close. Dashboards always look at the second ones; the first ones are the backup that gives us flexibility for the day we need to add a new aggregate.

#DataEngineering #Flink #GDELT
