In the previous article Metabase was left up and connected, ready to start building dashboards. My goal in the project is to use Metabase's graphical interface to create the models, the charts and the final dashboards. But that means I have to work out how to make those dashboards travel with the Git repository and install with the same ease as the rest of the project.

Metabase stores everything in an internal database (in H2 format, inside a Docker volume). A dashboard is not a file: it's a set of rows with numeric identifiers that reference other rows. The dashboard has cards; each card has a database id, a table id and several column ids; and some cards lean on others by id. Those numbers are local to the instance that created them. If I export the JSON as-is and try to re-inject it into another Metabase instance, all the identifiers point to different records than those in the original database and the dashboard doesn't work.

Two things are needed: export the dashboard without losing its references, and re-import it translating identifiers to those that exist at the destination.

An **exporter** queries Metabase's API and extracts three things:

- The dashboard JSON.

- The JSON of every card the dashboard uses (and of the cards those lean on).

- A trimmed copy of the metadata of every database involved: names of tables and columns alongside the numeric id Metabase had assigned to them.

That metadata is the bridge. Without it, there is no way to translate "column 482" to "this column of that table".

An **importer** queries the destination Metabase, builds translation dictionaries by pairing on name (database, table and column) and walks each card replacing the old ids with the new ones. It creates the cards in order, respecting their dependencies, mounts the dashboard on top and leaves it ready.

The result is a flow that fits with the rest of the project: dashboards live as JSON inside the repository, every change shows up in the `git diff` and a single command restores them on any machine with the system running.

It is not the flashiest part of the project, but it's the one that takes you from "I have a pretty dashboard on my laptop" to "the dashboard is part of the project".

#DataEngineering #Metabase #GDELT
