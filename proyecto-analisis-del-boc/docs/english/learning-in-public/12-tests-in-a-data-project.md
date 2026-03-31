In data engineering we don't talk enough about tests. Tutorials focus on building data pipelines, not on verifying they work. And yet, tests are what let you sleep at night.

My Boletín Oficial de Canarias project has about thirty test files spread between the data pipeline (Python, with pytest) and the frontend (TypeScript, with Vitest). Each part is tested with a different approach because the problems they solve are different.

In the data pipeline, the challenge is that the input data is unpredictable. The BOC's HTML from 1982 looks nothing like 2009's or the current one. The only reliable way to know a parser works is to test it against real HTML. That's why the pipeline tests use as fixtures pages downloaded directly from the BOC website and real PDFs of historical bulletins. These aren't made-up data: they're the same documents the system processes in production.

If the 1982-format parser extracts eleven dispositions from a specific bulletin, the test verifies that it still extracts exactly eleven, with the correct sections, issuing bodies, and links. The same goes for PDFs: the test checks that fifty-five dispositions are extracted from a 2001 bulletin, that there are no words broken by hyphens, and that the summaries don't contain elements from the website's headers or footers.

On the frontend, unit tests verify components and business logic with mocked data repositories. Does the paginator disable the button when there's no next page? Does the search builder correctly translate "convocatoria beca" into the PostgreSQL search expression? Are the filters by date, section, and issuing body serialized correctly in the URL? These are fast tests that run without a database.

But there are also integration tests that do connect to a real PostgreSQL. These verify that the repository queries return coherent results: that pagination doesn't produce duplicates, that coverage percentages are between zero and one hundred, that section counts match the total number of dispositions. These are the tests that catch the errors a mock would never find.

The best decision was using real data as fixtures instead of fabricating simplified examples. Made-up HTML only verifies what you imagined could go wrong. Real HTML from the 1993 BOC verifies what actually goes wrong, including cases you would never have anticipated. Every time a parser fails with a new format, the document that caused the error becomes another fixture. The suite grows with the project, and each test is a contract: this worked this way once and must keep working this way forever.

#DataEngineering #LearningInPublic #DataTalksClub #Testing #Python #Vitest #OpenData
