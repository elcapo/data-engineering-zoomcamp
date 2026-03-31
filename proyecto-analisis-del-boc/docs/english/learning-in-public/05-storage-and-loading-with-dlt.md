In previous articles I explained how the Python parsers extract structured data from the BOC's HTML. But between "the parser returns a JSON" and "the data is in PostgreSQL ready for searching" there's a gap: how raw data is stored and how it's loaded into the database.

The first design principle was to always preserve the original data. Each file downloaded from the BOC is saved compressed as-is in MinIO, organized in an immutable bucket. If tomorrow I discover a bug in a parser or want to extract a new field, I can reprocess without downloading again. MinIO acts as the data lake: cheap, durable, and decoupled from the transformation logic.

After parsing, the documents converted to Markdown are saved in a second bucket (boc-markdown) with metadata in YAML format. This gives me two layers: the original HTML and the clean, structured version.

For loading into PostgreSQL I use DLT (Data Load Tool). Each extraction flow in Kestra includes a small Python script that defines a DLT resource with its primary key and runs the pipeline. DLT takes care of creating the tables, managing the schema, and — most importantly — performing a merge: if I reprocess a bulletin, the data gets updated without duplicates thanks to strategically chosen primary keys.

In parallel with data loading, each download and each extraction is logged in tracking tables. These are simple tables that record what has been processed and when. On top of these tables sit SQL metric views that cross-reference what should exist (according to the level above) with what has actually been downloaded or extracted. The result is a coverage percentage by year and level.

These views are the foundation of the tracking system I mentioned in the article about Kestra: the flow that queries a view that detects years with gaps and triggers the necessary backfills. They also feed the metrics page in the frontend, where any visitor can see the real download status.

The pattern is simple but effective: raw data in MinIO, structured data in PostgreSQL via DLT with idempotent merge, and logs that let you know exactly what's missing. No heavy frameworks, no complex infrastructure.

#DataEngineering #LearningInPublic #DataTalksClub #DLT #PostgreSQL #MinIO #OpenData
