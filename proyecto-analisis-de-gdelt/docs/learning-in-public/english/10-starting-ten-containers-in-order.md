Bringing the whole system up with `docker compose up` sounds fine in theory, but as soon as there are more than three or four containers the reality is different: they all start at once, some take longer than others, and those that depend on the slow ones fail on the first attempt. This project has about ten containers and the ordered startup had to work without human intervention — nor divine.

To achieve it, three pieces are needed, and Docker Compose already offers all three.

**1. Healthchecks (`healthcheck`)** on the services that others will query.

Postgres, Redpanda and Kestra each declare a small command that Docker runs every few seconds to answer the question "are you ready to serve requests?". Postgres asks with `pg_isready`, Redpanda queries its own `rpk cluster health`, Kestra hits its configuration endpoint. Starting is not the same as being ready, and this is something Docker needs to know.

**2. Dependency declarations (`depends_on` with `condition:`)** to express different kinds of waits.

- `service_healthy`: "wait until the other passes its check". Flink and the producer wait this way on Postgres and Redpanda.

- `service_completed_successfully`: "wait until the other finishes and exits". Flink doesn't start until `dbt-init` has loaded the seeds; pgAdmin doesn't start until `pgadmin-init` has configured it to come up already set up.

- `service_started`: "as long as it has started, that's enough". Used only where no stronger guarantee is needed.

**3. One-shot initializers (`restart: "no"`).**

These are containers meant to do a specific task and exit:

- `redpanda-init` creates the Kafka topics.

- `pgadmin-init` generates the `pgpass` file so pgAdmin starts preconfigured.

- `dbt-init` loads the reference tables and creates the raw tables.

- `metabase-init` registers the database in Metabase.

- `flink-job-submitter` submits the jobs to Flink.

All of them are idempotent. Run them twice and nothing breaks. And none of them stays running.

Putting the three pieces together, startup becomes a deterministic chain: Postgres and Redpanda become healthy; the relevant initializers run and exit; Kestra and Flink see their prerequisites met and start; Metabase ends up last. The user only types `make up` and doesn't need to know the order or the timings.

One detail that rounds out the picture: the GDELT producer carries `profiles: ["cli"]`. That means it does **not** start with the rest. Kestra launches it on demand in its own container every 15 minutes.

#DataEngineering #Docker #GDELT
