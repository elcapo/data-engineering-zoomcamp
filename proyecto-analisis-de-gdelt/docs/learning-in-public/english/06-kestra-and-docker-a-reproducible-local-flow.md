With download and publishing split into two processes, the next thing was to decide who triggers them, in what order, and what happens when something fails. That piece is the project's orchestrator — in my case, Kestra.

Kestra brings three things I considered non-negotiable:

- **Clear scheduling**: you tell it "every 15 minutes" and the flow fires on its own, chaining the two tasks in order.

- **Per-task configurable retries**: the download retries with growing waits (because GDELT's index arrives before the files, as I explained in the previous article); publishing retries with short, fixed waits.

- **Real observability**: every execution is recorded, with its tasks, its retries, its output logs and the exact reason for the failure. From the web interface you can see, step by step, what happened in each cycle.

Around it, everything lives inside a Docker Compose: Redpanda (which plays the role of event stream), Postgres, Kestra, an initial step that loads the reference tables with dbt, and the producer itself — which Kestra launches on demand in its own container, not as an always-on service.

The practical consequence is very convenient: anyone who clones the repository can bring the entire system up on their laptop with a single command, and real GDELT data starts arriving within a few minutes without depending on anything external.

#DataEngineering #Kestra #Docker #GDELT
