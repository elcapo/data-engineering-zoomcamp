In the article about infrastructure with Docker I explained that Kestra runs its Python tasks inside containers based on a project-specific image. Today I want to talk about a specific decision within that image: copying the SQL files alongside the Python code.

Kestra flows are defined in YAML. Inside each flow you can write Python scripts (or in other languages) that run as tasks. When I mixed SQL directly into those scripts, I ran into a predictable problem: the queries ended up buried between triple quotes inside Python blocks that were themselves inside YAML files. Three levels of nesting to read a "CREATE TABLE." Editing a view meant opening the flow's YAML, finding the right Python script, locating the SQL string, and hoping not to break the indentation.

The solution was to move all the SQL to independent files. The project's Dockerfile was already copying the Python modules; adding a line to also copy the SQL directory was trivial. Now the flows read the SQL files from the container's filesystem. The flow's YAML only contains the orchestration logic: connect to the database, iterate over a list of files, and execute them in order.

This separation has several practical advantages. I can open any SQL file with syntax highlighting, autocompletion, and editor validation. I can test a query by copying it directly into a PostgreSQL client without extracting it from anywhere. And when I need to change a view, I edit a .sql file and rebuild the image, without touching the flows.

The same strategy allowed me to create two auxiliary jobs that turned out to be fundamental:

1. The first prepares the database: it creates the schemas, the tracking tables, and the views that calculate the pipeline's coverage. By using idempotent statements, this job is safe to re-run at any time and works both for the initial setup and for applying schema changes.

2. The second job keeps the section and issuing body catalogs up to date, recalculating them from the already-extracted data.

Both jobs are simply ordered lists of SQL files executed in sequence — something that's easy to read and maintain precisely because each query lives in its own file.

The principle behind all of this is keeping each language in its place. YAML for orchestration, Python for processing logic, SQL for queries. When you respect the boundaries between languages, each part of the system becomes easier to read, to test, and to change independently.

#DataEngineering #LearningInPublic #DataTalksClub #Docker #SQL #PostgreSQL #Kestra #OpenData
