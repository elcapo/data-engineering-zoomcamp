Once the data is in PostgreSQL, the next question is obvious: how do I query it? And this is where having everything in a well-structured relational database makes a difference compared to the original BOC website.

The most powerful search is full-text search. PostgreSQL has native support via `tsvector` and `tsquery`, without the need for an external engine (like Elasticsearch). Each disposition has a generated column that combines title and body, tokenized with the Spanish configuration. An index on that column makes searches fast even across hundreds of thousands of documents.

I did the same with the summaries from each bulletin's index, which allows searching even in dispositions whose full text hasn't been downloaded yet.

But full-text search isn't the only advantage of having the data in PostgreSQL. By extracting the metadata from each disposition (section, issuing body, date, year, bulletin number), filter queries are trivial. How many dispositions has a specific body published? What was published between two dates? Which sections have the most activity in a given year? These are queries that resolve in milliseconds and that on the original BOC website are simply not possible.

The combination is what's really useful: full text plus filters. Searching for "grant" only in dispositions from the Department of Education published in 2024 is a single SQL query that combines full-text search with filters on issuing body, year, and section.

I also implemented dynamic facets: along with the results, the query returns the years, sections, and issuing bodies with the most matches. This lets users explore the data without knowing in advance what to look for.

For contextual excerpts I use `ts_headline()`, which returns text fragments around the matched terms, marked with HTML tags for visual highlighting.

All of this works with standard PostgreSQL. No need for Elasticsearch, Solr, or any additional service. For this project's volume, PostgreSQL is more than enough and the operational complexity is minimal.

#DataEngineering #LearningInPublic #DataTalksClub #PostgreSQL #FullTextSearch #SQL #OpenData
