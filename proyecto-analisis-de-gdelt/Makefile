.PHONY: init up down reset

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
