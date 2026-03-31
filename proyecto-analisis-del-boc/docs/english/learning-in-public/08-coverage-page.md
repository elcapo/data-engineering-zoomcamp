When you download more than 200,000 documents incrementally over weeks, you need to know at all times what you have and what you're missing. That's why one of the first pages I built in the frontend was the Coverage page.

The idea is simple: cross-reference what should exist (according to the level above in the hierarchy) with what has actually been downloaded and extracted. If the 2024 year index lists 250 bulletins, how many do I have? And of those bulletins, how many dispositions have I downloaded? How many have I extracted? The answer to each question is a SQL view that joins the data tables with the log tables I mentioned in the previous article about DLT.

There are six views in total, two per level (download and extraction): years, bulletins, and dispositions. Each one calculates a coverage percentage. These views already existed in the pipeline to feed Kestra's automatic trackers, so reusing them in the frontend was immediate.

The page shows coverage at three hierarchical levels that the user can progressively expand. At the top, three KPI cards with the global percentages: years downloaded, bulletins downloaded, and full text extracted. These are the three numbers that summarize the project's status at a glance.

Below, expandable tables. Clicking on a year unfolds its bulletins with color-coded progress bars: green above 95%, blue between 50% and 95%, orange below. Clicking on a bulletin shows its individual dispositions with download and extraction dates.

Details are loaded on demand. The initial page only fetches the aggregated data. When the user expands a year, an API call fetches that year's bulletins. When they expand a bulletin, another call fetches the paginated dispositions. This way the initial load is fast and the page scales without issues even as the data volume grows.

Beyond its usefulness as a monitoring tool during development, the Coverage page serves another purpose: transparency. Any visitor can see exactly what percentage of the historical archive is available and where the gaps are. In an open data project, honestly showing the state of the data seems to me just as important as the data itself.

#DataEngineering #LearningInPublic #DataTalksClub #NextJS #PostgreSQL #DataQuality #OpenData
