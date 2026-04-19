.PHONY: init up down reset repartition metabase-export metabase-import

init:
	@[ -f .env ] || { \
	  echo "Generating .env from env.template with random passwords..."; \
	  POSTGRES_PW=$$(openssl rand -base64 24 | tr -d '/+='); \
	  PGADMIN_PW=$$(openssl rand -base64 24 | tr -d '/+='); \
	  KESTRA_PW=$$(openssl rand -base64 16 | tr -d '/+=')A1; \
	  METABASE_PW=$$(openssl rand -base64 16 | tr -d '/+=')A1; \
	  sed \
	    -e "s|__POSTGRES_PASSWORD__|$$POSTGRES_PW|" \
	    -e "s|__PGADMIN_PASSWORD__|$$PGADMIN_PW|" \
	    -e "s|__KESTRA_PASSWORD__|$$KESTRA_PW|" \
	    -e "s|__METABASE_PASSWORD__|$$METABASE_PW|" \
	    env.template > .env; \
	}

up: init
	docker compose up -d --build
	docker compose up -d --force-recreate --no-deps dbt-init metabase-init

down:
	docker compose down

reset:
	docker compose down -v
	rm -f .env

# Recreate raw tables as partitioned without losing Redpanda data.
# Flink is stopped, consumer-group offsets are reset, dbt drops + recreates
# the tables (now partitioned), and Flink is relaunched replaying from the
# earliest offset.
repartition:
	@echo "== Repartitioning raw tables (no data loss) =="
	@echo "[1/5] Stopping Flink jobs..."
	docker compose rm -sf flink-jobmanager flink-taskmanager flink-job-submitter
	@echo "[2/5] Resetting Flink consumer-group offsets in Redpanda..."
	-docker compose exec -T redpanda rpk group seek flink-raw-ingest --to start
	-docker compose exec -T redpanda rpk group seek flink-event-aggregations --to start
	-docker compose exec -T redpanda rpk group seek flink-gkg-aggregations --to start
	@echo "[3/5] Dropping existing raw tables..."
	docker compose build dbt-init
	docker compose run --rm --no-deps dbt-init run-operation drop_raw_tables
	@echo "[4/5] Recreating partitioned tables..."
	docker compose run --rm --no-deps dbt-init build
	@echo "[5/5] Relaunching Flink..."
	docker compose up -d --build flink-jobmanager flink-taskmanager flink-job-submitter
	@echo "== Done. Flink will replay from earliest offset =="

metabase-export:
	@[ -n "$(DASHBOARD)" ] || { echo "Usage: make metabase-export DASHBOARD=<name>"; exit 1; }
	@python3 metabase/scripts/export-dashboard.py "$(DASHBOARD)"

metabase-import:
	@[ -n "$(DIR)" ] || { echo "Usage: make metabase-import DIR=<export-dir> [SUFFIX=' (imported)']"; exit 1; }
	@python3 metabase/scripts/import-dashboard.py "$(DIR)" $(if $(SUFFIX),--name-suffix "$(SUFFIX)") $(if $(COLLECTION),--collection-id $(COLLECTION))
