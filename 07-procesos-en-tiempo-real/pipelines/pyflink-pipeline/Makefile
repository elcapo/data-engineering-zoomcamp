initialize: up create-topics create-tables

COMPOSE = docker compose -f docker-compose.yml -f docker-compose.flink.yml

up:
	$(COMPOSE) up -d

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs

down:
	$(COMPOSE) down --remove-orphans

create-topics:
	$(COMPOSE) exec redpanda rpk topic create rides --partitions 3 --if-not-exists

create-tables:
	$(COMPOSE) exec -T postgres psql -U postgres < sql/create_processed_events.sql
	$(COMPOSE) exec -T postgres psql -U postgres < sql/create_processed_events_aggregated.sql

run-pass:
	$(COMPOSE) exec -d jobmanager ./bin/flink run -py /opt/src/jobs/pass_through_job.py --pyFiles /opt/src -d

run-aggregate:
	$(COMPOSE) exec -d jobmanager ./bin/flink run -py /opt/src/jobs/aggregate_job.py --pyFiles /opt/src -d
