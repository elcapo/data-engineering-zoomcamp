COMPOSE = docker compose -f docker-compose.yml -f docker-compose.flink.yml
NETWORK = pyflink-pipeline_default
TOPIC ?= rides
CONSUMER_GROUP ?= rides-to-postgres
PARTITION ?= 0
OFFSET ?= 0
COUNT ?= 0

initialize: up create-topics create-tables

reset: down-and-clear-volumes initialize

build:
	$(COMPOSE) up -d --build --force-recreate

up:
	$(COMPOSE) up -d

ps:
	$(COMPOSE) ps

logs:
	$(COMPOSE) logs

down:
	$(COMPOSE) down --remove-orphans

down-and-clear-volumes:
	$(COMPOSE) down -v

create-topics:
	$(COMPOSE) exec redpanda rpk topic create rides --partitions 3 --if-not-exists
	$(COMPOSE) exec redpanda rpk topic create structured_rides --partitions 3 --if-not-exists
	$(COMPOSE) exec redpanda rpk topic create green-trips --if-not-exists

create-tables:
	$(COMPOSE) exec -T postgres psql -U postgres < sql/create_processed_events.sql
	$(COMPOSE) exec -T postgres psql -U postgres < sql/create_processed_events_aggregated.sql
	$(COMPOSE) exec -T postgres psql -U postgres < sql/create_aggregated_pickup.sql
	$(COMPOSE) exec -T postgres psql -U postgres < sql/create_aggregated_longest_streak.sql

run-pass:
	$(COMPOSE) exec -d jobmanager ./bin/flink run -py /opt/src/jobs/pass_through_job.py --pyFiles /opt/src -d

run-aggregate:
	$(COMPOSE) exec -d jobmanager ./bin/flink run -py /opt/src/jobs/aggregate_job.py --pyFiles /opt/src -d

run-homework-longest-streak:
	$(COMPOSE) exec -d jobmanager ./bin/flink run -py /opt/src/jobs/aggregated_longest_streak_job.py --pyFiles /opt/src -d

file-events:
	uv run src/producers/file_producer.py

delayed-events:
	uv run src/producers/delayed_producer.py

avro-events:
	uv run src/producers/avro_producer.py

homework-events:
	uv run src/producers/homework_producer.py

avro-consumer:
	uv run src/consumers/avro_consumer.py

kcat:
	docker run --network $(NETWORK) edenhill/kcat:1.7.1 -b redpanda:29092 -C -t $(TOPIC) -p $(PARTITION) -o $(OFFSET) -c $(COUNT)

kafka-console-consumer:
	docker run --rm -it --network $(NETWORK) confluentinc/cp-kafka:7.6.0 kafka-console-consumer --bootstrap-server redpanda:29092 --topic $(TOPIC) --from-beginning

kafka-consumer-groups:
	docker run --rm -it --network $(NETWORK) confluentinc/cp-kafka:7.6.0 kafka-consumer-groups --bootstrap-server redpanda:29092 --describe --group $(CONSUMER_GROUP)
