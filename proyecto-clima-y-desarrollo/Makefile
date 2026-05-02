.PHONY: init up down reset test \
        smoke-test-worldbank smoke-test-openaq smoke-test-flink smoke-test-spark smoke-test-marts smoke-test-metabase smoke-test-terraform \
        openaq-backfill-all \
        metabase-export metabase-import \
        render-architecture-diagram

init:
	@if [ ! -f .env ]; then \
	  echo "Generating .env from env.template with random passwords..."; \
	  POSTGRES_PW=$$(openssl rand -base64 24 | tr -d '/+='); \
	  KESTRA_PW=$$(openssl rand -base64 16 | tr -d '/+=')A1; \
	  MINIO_PW=$$(openssl rand -base64 24 | tr -d '/+='); \
	  METABASE_PW=$$(openssl rand -base64 16 | tr -d '/+=')Aa1!; \
	  sed \
	    -e "s|__POSTGRES_PASSWORD__|$$POSTGRES_PW|" \
	    -e "s|__KESTRA_PASSWORD__|$$KESTRA_PW|" \
	    -e "s|__MINIO_ROOT_PASSWORD__|$$MINIO_PW|" \
	    -e "s|__METABASE_ADMIN_PASSWORD__|$$METABASE_PW|" \
	    env.template > .env; \
	fi
	@if ! grep -q '^METABASE_ADMIN_PASSWORD=' .env; then \
	  METABASE_PW=$$(openssl rand -base64 16 | tr -d '/+=')Aa1!; \
	  echo "Appending METABASE_ADMIN_PASSWORD to existing .env..."; \
	  printf '\nMETABASE_ADMIN_PASSWORD=%s\n' "$$METABASE_PW" >> .env; \
	fi

up: init
	docker compose up -d --build
	docker compose up -d --force-recreate --no-deps dbt-init

down:
	docker compose down

reset:
	docker compose down -v
	rm -f .env

test:
	cd producer/worldbank && uv run pytest

smoke-test-worldbank: up
	@./scripts/smoke-test-worldbank.sh

smoke-test-openaq: up
	@./scripts/smoke-test-openaq.sh

smoke-test-flink: up
	@./scripts/smoke-test-flink.sh

smoke-test-spark: up
	@./scripts/smoke-test-spark.sh

smoke-test-marts: up
	@./scripts/smoke-test-marts.sh

smoke-test-metabase: up
	@./scripts/smoke-test-metabase.sh

smoke-test-terraform:
	@./scripts/smoke-test-terraform.sh

openaq-backfill-all:
	@./scripts/openaq-backfill-all.sh $(COUNTRIES_ARG) $(YEARS_ARG)

render-architecture-diagram:
	@./scripts/render-architecture-diagram.sh

metabase-export:
	@[ -n "$(DASHBOARD)" ] || { echo "Usage: make metabase-export DASHBOARD=<id|name|slug>"; exit 1; }
	@python3 metabase/scripts/export-dashboard.py "$(DASHBOARD)"

metabase-import:
	@[ -n "$(DIR)" ] || { echo "Usage: make metabase-import DIR=<export-dir> [SUFFIX=' (imported)'] [COLLECTION=<id>]"; exit 1; }
	@python3 metabase/scripts/import-dashboard.py "$(DIR)" $(if $(SUFFIX),--name-suffix "$(SUFFIX)") $(if $(COLLECTION),--collection-id $(COLLECTION))
