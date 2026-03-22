# PostgreSQL for Docker

## Install

To start using this container, start by cloning the repository:

```bash
git clone https://github.com/estudio-hawara/postgresql-for-docker.git
cd postgresql-for-docker
```

## Configure

Once you have cloned the repository, create a new `.env` file and set your safe passwords there.

```bash
cp env.example .env
```

## Docker Container

To start the container with minimum settings, just run:

```bash
docker compose up -d
```

Which is equivalent to loading the default `docker-compose.yml`:

```bash
docker compose -f docker-compose.yml up -d
```

To start the container with the 5432 port binded to the host, use the `docker-compose.port.yml` file:

```bash
docker compose -f docker-compose.yml -f docker-compose.port.yml up -d
```

### The `dc` Helper

To standardize calling Docker from the project root, the `dc` filename has been added to this project's `.gitignore`.

You are encouraged to create it either if you will be only using the standard file:

```bash
#!/bin/bash
docker compose -f docker-compose.yml "$@"
```

... or if you will also be using the open port file:

```bash
#!/bin/bash
docker compose -f docker-compose.yml -f docker-compose.port.yml "$@"
```

Thanks to this, and after giving executing permissions to the new file, you will be able to use this short hand:

```bash
# chmod +x dc
./dc up -d
```

## Maintenance Scripts

### Create a Bundle

To create a new user with it's related database, use the `create-bundle` script:

```bash
./dc exec postgresql create-bundle odoo

#> A new user odoo was created with the password VjFTxwNagaZGkQ5u.
#> A new database odoo was created.
#> The database odoo was linked with the user odoo.
```

Both the user and the database will have the same name.

### Create a Database

If you only want to create the database but you don't want to create a new user linked to it, use the `create-database` script:

```bash
./dc exec postgresql create-database odoo

#> A new database odoo was created.
```

### Create a User

Also, if you want to create a new user without a linked database, use the `create-user` script:

```bash
./dc exec postgresql create-user odoo

#> A new user odoo was created with the password nWGiMzcqlLx6/4Ug.
```

### Drop a Bundle

To drop an existing user with it's related database, use the `drop-bundle` script:

```bash
./dc exec postgresql drop-bundle odoo

#> The database odoo was dropped.
#> The user odoo was dropped.
```

### Drop a Database

If you only want to drop the database but you don't want to drop any user linked to it, use the `drop-database` script:

```bash
./dc exec postgresql drop-database odoo

#> The database odoo was dropped.
```

### Drop a User

Also, if you want to drop a user but you don't want to drop any linked database, use the `drop-user` script:

```bash
./dc exec postgresql drop-user odoo

#> The user odoo was dropped.
```

### Create an Administrator

To assign a user privileges to create databases, there is a `set-admin`script:

```bash
./dc exec postgresql set-admin odoo

#> The user odoo can now create databases.
```

### Link a Database with a User

To grant a user privileges on a certain database, there is a `link-database-and-user` script:

```bash
./dc exec postgresql link-database-and-user odoo odoo

#> The database odoo was linked with the user odoo.
```

### Backup the Databases

To create a backup for one the databases, you can use the bundled `dump-database` script:

```bash
./dc exec postgresql dump-database odoo
```

That will create a `odoo.sql.gz` file in the `backups` folder.

### Restore a Backup

To restore a backup, you can use the `restore-database` script:

```bash
./dc exec postgresql restore-database odoo
```

The script will look for a file named `odoo.sql.gz` file in the `backups` folder and it will restore it's backup state.

Note that this script will start by droping the existing database `odoo`, then recreating it as an empty database and finally restoring the dump file.
