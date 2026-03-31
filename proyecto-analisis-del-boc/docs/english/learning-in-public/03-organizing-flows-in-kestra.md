In previous articles I introduced the project and the BOC data sources: a four-level hierarchy where each level must be scanned to discover what's in the next one. Today I'll talk about how I organized the flows in Kestra to traverse that hierarchy.

The flows are grouped into four categories: downloads, extractions, backfills, and trackers.

Downloads are atomic flows. Each one downloads a single resource from the BOC website and stores it compressed in MinIO. Before downloading, they check whether the file already exists, making them safe to re-run. When finished, each download automatically triggers the corresponding extraction as a subflow.

Extractions take the raw HTML from MinIO, parse it with Python tools, and load the structured data into PostgreSQL. Since the BOC sometimes doesn't publish an HTML version, I also implemented extractions that work directly from PDF documents, but I'll save that topic for the next article.

Backfills were the most interesting design decision. Kestra has native support for schedule-based data backfills: you define a cron and Kestra can run it retroactively for past dates. But the BOC sources don't fit that model. Bulletins don't follow a fixed calendar (they're not published on holidays or weekends) and their numbering has gaps. Trying to map that to a cron would have been fragile and confusing.

Instead, I designed backfills as explicit loops where I can specify, for example, a range of years, and they trigger the corresponding downloads and extractions.

The advantage is twofold. First, the cognitive load drops drastically: a backfill is simply "download bulletins 1 through 250 of year 2024," not "simulate this cron running 250 times on past dates." Second, by reusing the same atomic download flows, backfills inherit the existence check and automatic extraction for free.

The last group is trackers. These jobs query a PostgreSQL view that detects years with pending downloads or extractions and triggers the necessary backfills. If a download failed or new bulletins were added to an already-processed year, the tracker corrects it without manual intervention.

Above everything sits a single scheduled flow that runs at midnight to automatically import new publications.

The result is a pipeline that distinguishes between daily operation (scheduling + trackers) and initial or corrective loading (manual backfills), reusing the same basic building blocks.

#DataEngineering #LearningInPublic #DataTalksClub #Kestra #ETL #Orchestration #OpenData
