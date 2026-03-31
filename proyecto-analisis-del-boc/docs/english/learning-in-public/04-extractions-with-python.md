If in the previous article I talked about how I organized the Kestra flows into downloads, extractions, backfills, and trackers, now I'm going to talk about a design decision that shaped the project's development: pulling all the extraction logic out of the Kestra flows and moving it into independent Python modules.

The initial temptation was to write the parsers directly as scripts embedded in the YAML flows. Kestra allows it, and for quick prototypes it works well. But I quickly saw the problem: I couldn't test the extraction logic without running the entire flow. And when you're parsing HTML from a website that's been publishing since 1980, unit tests aren't a luxury — they're a necessity.

So I wrote each parser as an independent Python package with its own CLI and public API:

1. The `archive-parser` extracts the years from the general index based on its HTML page.

🔗 https://github.com/elcapo/data-engineering-zoomcamp/tree/main/proyecto-analisis-del-boc/pipeline/python/archive-parser

2. The `year-parser` extracts the bulletins for a year from its HTML page.

🔗 https://github.com/elcapo/data-engineering-zoomcamp/tree/main/proyecto-analisis-del-boc/pipeline/python/year-parser

3. The `issue-parser` extracts the dispositions from a bulletin based on its HTML page.

🔗 https://github.com/elcapo/data-engineering-zoomcamp/tree/main/proyecto-analisis-del-boc/pipeline/python/issue-parser

4. The `document-parser` converts the HTML of each disposition to Markdown with structured metadata.

🔗 https://github.com/elcapo/data-engineering-zoomcamp/tree/main/proyecto-analisis-del-boc/pipeline/python/document-parser

5. And the `issue-reader` extracts the dispositions from the PDF version of a bulletin.

🔗 https://github.com/elcapo/data-engineering-zoomcamp/tree/main/proyecto-analisis-del-boc/pipeline/python/issue-reader

Each one receives a file and returns structured data, with no dependencies on Kestra or MinIO.

The immediate benefit was being able to test them in isolation. Each module has its own directory of real examples and session fixtures. I can run the tests in seconds without spinning up any services.

The advantage became apparent when I started processing older years. The BOC website doesn't use the same HTML structure across all eras. The bulletins from 2026 have a different DOM than those from 1982, and there are intermediate variants. Instead of filling the code with conditionals, I implemented a format detection system: each parser registers its variants and the system tests which one recognizes the document. Adding support for a new format is a piece of cake.

This allowed for gradual development. The result: Kestra is limited to orchestrating (download, invoke the parser, load the result) and all the business logic lives in tested modules. If I migrate to another orchestrator tomorrow, the parsers work just the same.

#DataEngineering #LearningInPublic #DataTalksClub #Python #Testing #WebScraping #OpenData
