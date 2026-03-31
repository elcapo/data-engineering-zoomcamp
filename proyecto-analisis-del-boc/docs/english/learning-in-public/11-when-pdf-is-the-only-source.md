In the article about flow organization I mentioned that some of the bulletins from the Boletín Oficial de Canarias (BOC) don't have an HTML version and that I had implemented extractions directly from PDF. Let me explain.

The BOC's historical archive spans more than forty years. Almost all recent bulletins have an HTML index with links to each disposition, but some older ones are only available as PDF.

Extracting structure from a PDF is not like parsing HTML. In HTML you have tags that say "this is a heading" or "this is a link." In a PDF you only have individual characters with a position on the page, a font size, and a font name. There's no hierarchy, no semantics: PDFs are Mad Max.

The first step is grouping those characters into lines. Characters that share the same vertical position (with some tolerance) form a line. Within each line, they're sorted left to right and concatenated to reconstruct the text. But a line of text isn't enough: you need to know what type of content it is. Is it a section heading? An issuing body? A disposition summary?

This is where font analysis comes in. For each line, the system calculates the dominant font and the median character size. A bold line that starts with a Roman numeral is a section. An italic line is a subsection. A bold line without a Roman numeral is an issuing body. The normal text that follows is the disposition summary. This is how the visual hierarchy that a human reader sees is reproduced — only character by character.

Historical PDFs also have their own pitfalls. Some generate joined words ("AdministraciónLocal") that need to be split by detecting lowercase-to-uppercase transitions. Others break words across lines with hyphens ("tempo- ral") that need to be rejoined. And two-column summaries require detecting when a section repeats to know that you've moved from the first column to the second and should stop reading.

Since PDFs change format depending on the era (the 2001 layout isn't the same as 2006), the system uses the same detection pattern as the HTML parsers: each format implements a method that examines the document and decides if it knows how to process it. Today there are two recognized formats; adding a third means writing a new parser without touching the existing ones.

The result is that bulletins that only existed as flat PDFs now have their dispositions indexed in the database with section, issuing body, and summary — exactly like those that come from HTML. For the frontend's search engine there's no difference: a disposition from 2001 extracted from PDF appears alongside one from 2025 extracted from HTML, and both are equally searchable.

#DataEngineering #LearningInPublic #DataTalksClub #Python #PDF #PostgreSQL #OpenData #CanaryIslands
