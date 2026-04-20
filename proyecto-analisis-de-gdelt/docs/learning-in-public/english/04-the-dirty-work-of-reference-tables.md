In the previous article I split GDELT's data into different blocks and left the reference tables as the "easy" part. The truth is that, although they are the ones that change the least, they were the hardest to deal with.

These tables are the ones that translate GDELT's codes into something readable: country codes, event type codes, actor role codes, ethnicity codes, religion codes... Without them, each data row is basically alphabet soup.

The problem is that GDELT doesn't publish these tables as data files. It publishes them as chapters inside two PDF manuals, one from GDELT itself and another from the CAMEO system. And extracting the content by hand surfaces details that, if you ignore them, break the joins further down the line:

- The codes carry leading zeros and the width matters: `01` and `010` are not the same.

- Ethnicity codes are deliberately lowercase, to distinguish them from country codes.

- An actor's code is a concatenation of several fragments: `USAGOVLEG` means United States + government + legislative branch. There is no single table that resolves it; you have to cross several.

- The country tables in the manual use CAMEO codes, but the ethnicity table references countries with a different system (ISO 3166). A bridge between the two is needed.

The decision was to extract each table once, transcribe it into a CSV and version those files alongside the project's code. Once in the repository, dbt loads them as *seeds* with a single command: they show up in the database, in their own schema, ready to be queried.

This produced 16 files, some with just 4 rows and others with around 2,500, all documented with their chapter of origin. It is not the flashiest work in the project, but it is the one that turns GDELT's cryptic rows into something readable and interpretable.

#DataEngineering #GDELT #dbt
