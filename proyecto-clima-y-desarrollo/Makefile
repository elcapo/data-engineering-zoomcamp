.PHONY: init up down reset test \
        smoke-test-worldbank smoke-test-openaq smoke-test-flink smoke-test-spark smoke-test-marts smoke-test-metabase smoke-test-terraform \
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

render-architecture-diagram:
	@./scripts/render-architecture-diagram.sh

metabase-export:
	@docker compose exec -T metabase rm -rf /tmp/serialized
	@docker compose exec -T metabase /app/bin/run_metabase.sh export /tmp/serialized
	@rm -rf metabase/serialized.tmp && mkdir -p metabase/serialized.tmp
	@docker compose cp metabase:/tmp/serialized/. metabase/serialized.tmp/
	@find metabase/serialized -mindepth 1 -not -name 'README.md' -delete
	@cp -r metabase/serialized.tmp/. metabase/serialized/ 2>/dev/null || true
	@rm -rf metabase/serialized.tmp
	@echo "✓ Exported Metabase content to metabase/serialized/"

metabase-import:
	@if [ -z "$$(find metabase/serialized -mindepth 1 -not -name 'README.md' 2>/dev/null)" ]; then \
	  echo "metabase/serialized/ is empty (apart from README) — nothing to import."; \
	  exit 0; \
	fi
	@docker compose exec -T metabase rm -rf /tmp/serialized
	@docker compose exec -T metabase mkdir -p /tmp/serialized
	@docker compose cp metabase/serialized/. metabase:/tmp/serialized/
	@docker compose exec -T metabase /app/bin/run_metabase.sh import /tmp/serialized
	@echo "✓ Imported Metabase content from metabase/serialized/"
