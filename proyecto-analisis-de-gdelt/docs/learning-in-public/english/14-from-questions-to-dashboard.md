In the first article I listed the questions I was interested in answering with GDELT: where events are concentrated, which actors are the most active, how news propagates, what the tone of the coverage is. There wasn't a single line of code yet. A few hours of work later, the project has a dashboard.

The screenshot (see attached image) is just the finishing touch. Everything that holds up those charts has already been told: the dashboard lives in Metabase, reinstalls from Git with a single command, reads aggregated tables that Flink rewrites every 15 minutes, and comes up together with the other nine containers on any machine that clones the repository.

What is worth looking at is how each block of the dashboard answers one of the initial questions:

- **Global event map**. Each country coloured by number of events in the window. It resolves "where is the activity concentrated right now?" at a glance.

- **Top actors and media attention**. On the left, which actors appear most often in the events; on the right, which ones accumulate the most mentions. Two angles on the same question, "who is the most active?", separating what happens from what gets told.

- **Tone analysis by organization and by person**. GKG tone scores aggregated by entity. The question about the tonality of the coverage, split in two because "who" has two different scales.

- **Event volume and conflict trend**. Time series with the count by type and the average Goldstein scale per country. The question "is it rising or falling?" is answered, literally, as the slope of a line.

Each of those charts is a query on an aggregated table, and each aggregated table exists thanks to a specific decision made in an earlier article: primary keys to make the flows idempotent, windows anchored to processing time, schemas trimmed to the fields that really matter, and parallel branches that preserve the raw data in case tomorrow some calculation has to be redone.

If there is one conclusion after all this work, it is that the flashy part of a data project — the pretty dashboard — takes up a tiny fraction of the work. The rest is deciding how the system boots, how it recovers from a failure, how passwords are distributed, what gets stored raw and what gets aggregated, which clock each window is tied to. Things you don't see but which are the difference between a dashboard that works today on my laptop and a project that anyone can clone, bring up and look at.

#DataEngineering #GDELT #Closing

![Final project dashboard](../resources/images/dashboard/dashboard.png)
