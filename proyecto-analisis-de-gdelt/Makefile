.PHONY: init up down reset

init:
	@[ -f .env ] || { \
	  echo "Generating .env from env.template with random passwords..."; \
	  POSTGRES_PW=$$(openssl rand -base64 24 | tr -d '/+='); \
	  PGADMIN_PW=$$(openssl rand -base64 24 | tr -d '/+='); \
	  KESTRA_PW=$$(openssl rand -base64 16 | tr -d '/+=')A1; \
	  sed \
	    -e "s|__POSTGRES_PASSWORD__|$$POSTGRES_PW|" \
	    -e "s|__PGADMIN_PASSWORD__|$$PGADMIN_PW|" \
	    -e "s|__KESTRA_PASSWORD__|$$KESTRA_PW|" \
	    env.template > .env; \
	}
	@echo "Regenerating pgadmin/pgpass from .env..."
	@set -a; . ./.env 2>/dev/null || true; set +a; \
	  echo "postgres:5432:*:$${POSTGRES_USER:-gdelt}:$${POSTGRES_PASSWORD:-gdelt}" > pgadmin/pgpass
	@chmod 600 pgadmin/pgpass

up: init
	docker compose up -d --build

down:
	docker compose down

reset:
	docker compose down -v
	rm -f .env pgadmin/pgpass
