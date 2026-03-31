In the previous article I introduced my Data Engineering Zoomcamp project: a platform to download, index, and make the entire historical archive of the Boletín Oficial de Canarias searchable. Today I'm going to talk about the first real challenge: understanding and modeling the data sources.

In a data engineering project, the first step isn't choosing tools — it's understanding where the data comes from and how it's organized. In my case, the source is a single one: the official BOC website. But it hides a four-level hierarchy that must be traversed from top to bottom.

Everything starts at the archive page, which lists the available years since 1980. Clicking on a specific year shows the list of bulletins: one for each publication day, with its number and date. A typical year has between 150 and 250 bulletins.

Here's where it gets interesting. You can't know what dispositions exist without first downloading each bulletin. A bulletin's index is the only source that lists its dispositions, organized by sections and issuing bodies. Each entry includes a summary and links to the full text. A bulletin can have anywhere from a few dispositions to several dozen.

This means the data flow can't be a simple "download everything at once." It first has to scan the bulletins to discover which dispositions exist, and only then can it download them. It's a hierarchical download: each level depends on the previous one to know what's in the next.

The last level is the full text of each disposition: the HTML document with the complete content of a law, decree, resolution, or announcement. This is the most valuable data — the one that feeds full-text search and subsequent analysis.

To put the volume in perspective: as of today, the BOC archive contains 223,544 dispositions organized in 9,154 bulletins published over 47 years. It's not big data, but it's not trivial either. It's hundreds of thousands of HTML documents that need to be downloaded respectfully from the server, stored raw, parsed, converted, and loaded into a database. And the volume grows every business day with a new bulletin.

In the data pipeline, each level is downloaded as raw HTML and stored compressed in MinIO (the data lake). Then, Python parsers extract the structured data and links to the next level. This way the original HTML is always preserved: if I change the extraction logic tomorrow, I can reprocess without downloading again.

Documenting the hierarchy, the fields available at each level, and the dependencies between them is what allowed me to design a data pipeline that can run incrementally without losing data or overloading the source server.

#DataEngineering #LearningInPublic #DataTalksClub #WebScraping #ETL #OpenData #CanaryIslands
