We have a project that a new developer can copy onto their machine and get running with a single command. So far so good. But pull on the thread and you realize that behind that command there are several passwords: Postgres's, pgAdmin's, Kestra's, Metabase's. The temptation is to take the easy route: set some default passwords in the repository and trust each user to change them if they want. But "change it if you want" almost never happens, and you end up with systems running `admin/admin`.

So my decision for projects is a different one: the repository contains no passwords. Just a **template** (`env.template`) with placeholders. Something like:

```
POSTGRES_PASSWORD=__POSTGRES_PASSWORD__
PGADMIN_PASSWORD=__PGADMIN_PASSWORD__
KESTRA_PASSWORD="__KESTRA_PASSWORD__"
METABASE_PASSWORD=__METABASE_PASSWORD__
```

The first time someone runs `make up`, a preceding task called `make init` fills those placeholders with random passwords:

- Generates each password with `openssl`.

- Replaces each placeholder in the template with `sed` and writes the result to `.env`.

That `.env` file is in `.gitignore`, so it never travels with the repository: it lives only on the machine that generated it.

Two details make this comfortable to use:

- **Idempotency**: the task starts with `[ -f .env ]` — if the file already exists, it does nothing. So bringing the system up on an already-configured machine does not overwrite the passwords (which would break the connection with the persistent volumes already created with the previous ones).

- **Sensible defaults**: everything that isn't a secret (ports, usernames, database name) has a default inside the `docker-compose.yml` itself with the `${POSTGRES_USER:-gdelt}` syntax, so the template only has to worry about secrets.

The result is that the repository is safe to clone — it carries neither real nor example secrets — and every machine that uses it starts with unique passwords that only it knows.

#DataEngineering #Docker #Security #GDELT
