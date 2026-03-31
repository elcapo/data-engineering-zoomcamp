In previous articles I've talked about the data pipeline, the parsers, and the searches. Today I'll talk about where all of this runs and how Docker lets me treat infrastructure as files.

The project is deployed on two virtual machines at Clouding.io connected by an internal network. The first runs the data pipeline: Kestra, MinIO, and a PostgreSQL instance exclusively for Kestra's internal state. The second runs the frontend: PostgreSQL with the BOC data and the Next.js application. Kestra writes to the frontend's PostgreSQL through the internal network, and the frontend reads from that same database to serve searches.

All the infrastructure is defined in Docker Compose files. The data pipeline has a docker-compose.yml with four services (Kestra, its PostgreSQL, MinIO, and a client that initializes the buckets). The frontend has two: one for PostgreSQL and one for the web application. Both share a Docker network (boc-postgres-network) that in production maps to Clouding's internal network.

What's interesting about this approach is that the same files that define the production infrastructure work for local development. I run `docker compose up` on my laptop and have the same environment: the same services, the same networks, the same environment variables. There are no surprises when deploying because there's no difference between environments.

For the parts that do vary between local and production (such as port exposure or the reverse proxy), I use complementary compose files. Locally I use docker-compose.port.yml to expose ports directly. In production I use docker-compose.traefik.yml, which configures Traefik as a reverse proxy with TLS certificates from Let's Encrypt.

The images are also defined as code. The frontend uses a multi-stage Dockerfile that generates an optimized Next.js image. The data pipeline uses its own Dockerfile (boc-python) that pre-installs DLT, the MinIO client, and all the parsers as Python packages. Kestra runs its Python tasks inside containers based on that image.

The result is a project where everything needed to reproduce the complete environment is in the repository: services, networks, volumes, images, and configuration. Clone the repo, adjust the environment variables, and start it up. No manual setup documentation, no implicit steps.

#DataEngineering #LearningInPublic #DataTalksClub #Docker #IaC #CloudComputing #OpenData
