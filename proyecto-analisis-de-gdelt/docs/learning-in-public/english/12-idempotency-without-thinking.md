Idempotency has come up twice in a row in the last few articles: in the dashboard import scripts and in the `make init` that generates the `.env`. But where it really matters, and where it is taken care of in a near-invisible way, is inside the jobs that process the data in Flink.

The problem has two sides.

- The first is the restart. A Flink job can restart for many reasons: a one-off error, a new deploy, a machine that reboots. When that happens, the job re-reads Kafka from the most recent checkpoint, and Kafka keeps messages around for days. If the job simply ran an `INSERT` for every processed event, each restart would duplicate rows in Postgres.

- The second is the windowed computation itself. While a 15-minute window is open, Flink emits the same row several times: first with the events from the first few seconds, then with more events accumulated, then with the total at the close. If each emission translated into a new `INSERT`, we would end up with three or four different rows representing the same window and the same country.

The solution is declarative and fits in one line per table:

```
PRIMARY KEY (window_start, country) NOT ENFORCED
```

Flink's JDBC connector, on seeing a declared primary key, changes mode: instead of `INSERT`, it does `INSERT ... ON CONFLICT (pk) DO UPDATE` — what in Postgres is known as an `upsert`. If the row didn't exist, it creates it; if it was already there, it overwrites it. Same result whether the same row arrives once or ten times.

`NOT ENFORCED` deserves a note. It means "I, Flink, am not going to check that the key is really unique; I trust you". The actual check is done by Postgres with its own primary key constraint. Flink only needs that hint in the definition to decide which SQL to generate.

In the aggregated tables the primary key is always some combination of `window_start` and the dimensions grouped by (`country`, `actor_code`, `theme`...). In the raw events table it is simply `global_event_id`, which GDELT already guarantees to be unique worldwide.

The result: Flink's jobs can be stopped, restarted or redone from the start of Kafka's retention and the final tables always end up with the same content.

#DataEngineering #Flink #GDELT
