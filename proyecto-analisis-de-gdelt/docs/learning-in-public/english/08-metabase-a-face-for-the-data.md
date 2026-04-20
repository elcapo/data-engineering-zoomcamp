With the streaming part closed, the aggregated tables rewrite themselves in Postgres every cycle. But a table in Postgres isn't a dashboard yet: the layer that turns those rows into legible-at-a-glance charts is still missing.

Enter Metabase, for three reasons: 1) it is open source so you can run it as just another container, 2) it connects to Postgres without ceremony (you give it the credentials of a database and it discovers the tables automatically) and 3) it builds dashboards without asking for code, but accepts SQL for cases where that's convenient.

The interesting part isn't Metabase itself, but what happens the first time you start it. A fresh install asks you to create an admin user, to register by hand the database you want to query, to wait while it detects the tables, and, on top of that, it installs a sample database. All those steps are one-off but manual. And that breaks the main design principle of the project: clone, run `make up` and the system is up and running.

The solution was to add a small initializer container (`metabase-init`) that talks to Metabase's API right after it starts and uses it to do four things:

- Checks whether there is already an admin user and, if not, creates one.
- Registers the connection to `GDELT Postgres` if it wasn't already registered.
- Deletes the sample database.
- Triggers a schema sync so the tables appear right away.

These are a handful of API calls chained with `curl` and `jq`. If the system was already initialized, each check detects its prior state and does nothing.

The result is that after `make up`, Metabase is reachable on its port, with its database connected and tables visible. Only building the dashboards is left — which is precisely the part I *do* want to do by hand.

#DataEngineering #Metabase #GDELT
