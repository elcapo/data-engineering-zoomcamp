# GDELT Real-Time Stream Analysis - Execution Plan

## Context

The project has a complete README specification and architecture diagram but zero implementation code. The goal is to build a fully local, Docker-based pipeline that ingests GDELT data every 15 minutes, processes it through a streaming architecture, and visualizes it in Grafana. Everything must run with a single `docker compose up -d`.

## Phase 1: Infrastructure Foundation

**Goal**: Database schema + docker-compose with base services running, including Kestra as orchestrator.

### 1.1 `sql/init.sql`

Create PostgreSQL schema with:
- **Raw tables**: `events` (20 key columns from GDELT's 61), `mentions` (5 columns), `gkg` (11 columns)
- **Aggregated tables** (written by Flink): `event_counts_by_country`, `conflict_trend`, `top_actors`, `media_attention`, `tone_by_theme`
- Add indexes on timestamp columns for Grafana query performance

### 1.2 `docker-compose.yml`

Define all services:

| Service | Image | Ports |
|---------|-------|-------|
| kestra | `kestra/kestra:v1.3` | 8082 |
| redpanda | `redpandadata/redpanda:v25.3` | 9092 |
| redpanda-console | `redpandadata/console:v3.7.0` | 8080 |
| postgres | `postgres:18` | 5432 |
| flink-jobmanager | `build: ./flink` | 8081 |
| flink-taskmanager | `build: ./flink` | - |
| producer | `build: ./producer` | - |
| grafana | `grafana/grafana:12.4` | 3000 |

Key config:
- Kestra: mount `kestra/flows/` to load flow definitions; uses its own internal database (H2 by default); expose port 8082
- Redpanda: `--smp 1 --memory 512M --overprovisioned`, advertise as `redpanda:9092`
- Topic creation via `rpk topic create gdelt.events gdelt.mentions gdelt.gkg` in an init service
- PostgreSQL: user=gdelt, password=gdelt, db=gdelt, mount `sql/init.sql` to `/docker-entrypoint-initdb.d/`
- Healthchecks on redpanda (`rpk cluster health`), postgres (`pg_isready`), and kestra (HTTP)
- Service dependency chain: redpanda -> kestra; kestra -> producer; postgres -> flink, grafana

**Verify**: `docker compose up -d kestra redpanda redpanda-console postgres` - services start, Kestra UI at :8082, Redpanda Console at :8080, psql connects.

## Phase 2: Kestra Orchestration + Python Producer

**Goal**: Kestra triggers the producer every 15 minutes. The producer downloads GDELT CSVs and publishes JSON records to Redpanda.

### 2.0 `kestra/flows/gdelt_ingest.yml`

Kestra flow definition:
- **id**: `gdelt-ingest`, **namespace**: `gdelt`
- **triggers**: `schedule` with cron `*/15 * * * *` (every 15 minutes)
- **tasks**: Single `docker` task that runs the producer container
  - Mount the Docker socket or use Kestra's `io.kestra.plugin.scripts.python.Script` task to execute the producer
  - Pass Redpanda broker address as environment variable
  - The producer runs once (no internal loop), processes the latest GDELT update, then exits
- **retry**: Kestra-level retry with maxAttempt=3 and exponential backoff (replaces producer-internal retry)

### Files to create

- `producer/Dockerfile` - Python 3.12-slim, install deps, run main.py
- `producer/pyproject.toml` - deps: `requests`, `kafka-python-ng`
- `producer/gdelt.py` - Core logic:
  - `fetch_latest_urls()` - GET `http://data.gdeltproject.org/gdeltv2/lastupdate.txt`, parse 3 lines (export/mentions/gkg URLs)
  - `download_and_extract(url)` - Download ZIP, extract CSV in memory via `zipfile.ZipFile(io.BytesIO(...))`
  - `parse_events(csv_text)` - Tab-split, extract columns by index (0,1,5,6,7,15,16,17,26,28,30,31,32,34,52,53,56,57,59,60), return list of dicts
  - `parse_mentions(csv_text)` - Indices 0,1,2,4,13
  - `parse_gkg(csv_text)` - Indices 0,1,3,4,7,9,10,15; parse tone subfield (7 comma-separated floats)
- `producer/main.py` - Single-run execution (no polling loop; Kestra handles scheduling):
  - Init KafkaProducer with JSON serializer
  - Fetch the latest GDELT update, download and parse CSVs
  - Publish to `gdelt.events`, `gdelt.mentions`, `gdelt.gkg` topics
  - Use GlobalEventID/GKG RecordID as Kafka key
  - Log record counts and exit with code 0 on success, non-zero on failure (Kestra uses exit code for retry decisions)

### GDELT parsing notes

- Tab-delimited, no header, no quoting
- Timestamps format: `YYYYMMDDHHmmSS`
- Empty fields are common (treat as None)
- GKG themes: semicolon-delimited
- GKG tone: `tone,pos,neg,polarity,activity,selfgroup,wordcount`

**Verify**: `docker compose up -d kestra redpanda` then trigger the flow manually from Kestra UI at :8082 and check `rpk topic consume gdelt.events --num 5`

## Phase 3: Flink Stream Processing

**Goal**: Consume from Redpanda, compute windowed aggregations, write to PostgreSQL.

### 3.1 `flink/Dockerfile`

Based on `flink:1.20.3`:
- Install Python 3 + `apache-flink==1.20.3`
- Download connector JARs to `/opt/flink/lib/`:
  - `flink-sql-connector-kafka-3.3.0-1.20.jar` (Maven Central)
  - `flink-connector-jdbc-3.3.0-1.20.jar` (Maven Central)
  - `postgresql-42.7.3.jar` (jdbc.postgresql.org)
- Copy jobs/ into image

### 3.2 `flink/jobs/event_aggregations.py`

Use Flink Table API (SQL):
1. Define Kafka source tables (`kafka_events`, `kafka_mentions`) with JSON format
2. Define JDBC sink tables mapping to PostgreSQL aggregated tables
3. Aggregations:
   - **event_counts_by_country**: 15-min tumbling window, GROUP BY country + event_root_code, COUNT/AVG
   - **conflict_trend**: 1-hour tumbling window, GROUP BY country, AVG(goldstein_scale)
   - **top_actors**: 1-hour tumbling window, GROUP BY actor_code, COUNT
   - **media_attention**: 15-min tumbling window, GROUP BY global_event_id, COUNT mentions

### 3.3 `flink/jobs/gkg_aggregations.py`

1. Kafka source for `gdelt.gkg`
2. **tone_by_theme**: 1-hour tumbling window, pre-explode themes in producer (one message per theme) to simplify Flink SQL, GROUP BY theme, AVG(tone)

### 3.4 `flink/submit-jobs.sh`

Wait for jobmanager readiness, then:
```bash
flink run -py /opt/flink/jobs/event_aggregations.py -d
flink run -py /opt/flink/jobs/gkg_aggregations.py -d
```
Add a `flink-job-submitter` one-off service in docker-compose.

**Verify**: Flink Web UI at :8081 shows RUNNING jobs. After 15 min: `SELECT * FROM event_counts_by_country LIMIT 10;` returns rows.

## Phase 4: Grafana Dashboards

**Goal**: Auto-provisioned datasource and 6 dashboard panels.

### Files to create

- `grafana/Dockerfile` - Based on `grafana/grafana:12.4.0` (not `grafana-oss`, deprecated from 12.4.0 onwards). Copy provisioning/ into image
- `grafana/provisioning/datasources/postgres.yml` - PostgreSQL connection (host=postgres, db=gdelt, sslmode=disable)
- `grafana/provisioning/dashboards/dashboard.yml` - File provider pointing to provisioning dir
- `grafana/provisioning/dashboards/gdelt.json` - Dashboard with 6 panels:

| Panel | Type | Source Table | Query |
|-------|------|-------------|-------|
| Global Event Map | Geomap | events | lat/lon colored by goldstein_scale, last 24h |
| Event Volume | Time series | event_counts_by_country | SUM(event_count) by window_start, event_root_code |
| Conflict Trend | Time series | conflict_trend | avg_goldstein over time, top-5 countries |
| Top Actors | Bar chart | top_actors | Latest window, ORDER BY event_count DESC LIMIT 20 |
| Media Attention | Time series | media_attention | mention_count over time |
| Tone Analysis | Bar chart | tone_by_theme | avg_tone by theme, latest windows |

**Verify**: localhost:3000, login admin/admin, GDELT dashboard shows panels (data appears after first window closes).

## Phase 5: Integration Test & Polish

1. Full `docker compose up -d` - all services start cleanly
2. Verify Kestra UI at :8082 shows the `gdelt-ingest` flow with a 15-min schedule
3. Wait ~20 minutes for first scheduled execution
4. Verify end-to-end: Kestra triggers -> Producer -> Redpanda topics -> Flink RUNNING -> PostgreSQL rows -> Grafana panels
5. Polish:
   - Producer deduplication (track last URL in file volume)
   - Flink: `ignore-parse-errors` on Kafka sources
   - Redpanda topic retention: 24h
   - Resource limits in docker-compose (~3-4GB total)

## Risks

| Risk | Mitigation |
|------|-----------|
| PyFlink + JAR compatibility | Pin exact versions (1.20.3 + 3.3.0-1.20); fallback to Flink SQL CLI |
| GKG theme unnesting in SQL | Pre-explode themes in producer instead |
| GDELT empty/null fields | Producer treats empty strings as None, wraps type conversion in try/except |
| First-run wait time | 15-min windows mean ~15 min before data appears in Grafana |

## Build Order

```
sql/init.sql -> docker-compose.yml (infra) -> producer/ -> kestra/flows/ -> flink/ -> grafana/ -> integration test
```
