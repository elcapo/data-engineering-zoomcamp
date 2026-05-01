.PHONY: init up down reset test smoke-test-worldbank smoke-test-openaq smoke-test-flink

init:
	@[ -f .env ] || { \
	  echo "Generating .env from env.template with random passwords..."; \
	  POSTGRES_PW=$$(openssl rand -base64 24 | tr -d '/+='); \
	  KESTRA_PW=$$(openssl rand -base64 16 | tr -d '/+=')A1; \
	  MINIO_PW=$$(openssl rand -base64 24 | tr -d '/+='); \
	  sed \
	    -e "s|__POSTGRES_PASSWORD__|$$POSTGRES_PW|" \
	    -e "s|__KESTRA_PASSWORD__|$$KESTRA_PW|" \
	    -e "s|__MINIO_ROOT_PASSWORD__|$$MINIO_PW|" \
	    env.template > .env; \
	}

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
