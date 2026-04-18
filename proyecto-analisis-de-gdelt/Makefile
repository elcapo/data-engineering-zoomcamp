.PHONY: init up down reset metabase-export metabase-import

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

metabase-export:
	@[ -n "$(DASHBOARD)" ] || { echo "Usage: make metabase-export DASHBOARD=<name>"; exit 1; }
	@python3 metabase/scripts/export-dashboard.py "$(DASHBOARD)"

metabase-import:
	@[ -n "$(DIR)" ] || { echo "Usage: make metabase-import DIR=<export-dir> [SUFFIX=' (imported)']"; exit 1; }
	@python3 metabase/scripts/import-dashboard.py "$(DIR)" $(if $(SUFFIX),--name-suffix "$(SUFFIX)") $(if $(COLLECTION),--collection-id $(COLLECTION))
