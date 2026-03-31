At this point, it's no secret that I'm taking part in DataTalksClub's Data Engineering Zoomcamp, a free and open course covering the fundamentals of modern data engineering: pipeline orchestration, data lakes and warehouses, and batch and real-time processing. As a final project, each student develops a real-world case from start to finish. Let me tell you about mine.

The Boletín Oficial de Canarias (BOC) publishes thousands of dispositions every year: public calls, regulations, grants, resolutions... Documents that directly affect citizens, businesses, lawyers, and journalists. The problem is that the official BOC website offers neither a complete index nor advanced search over the text of the dispositions. If you need to find a specific document among the more than one hundred thousand published since 1980, the experience is slow and limited.

Any data analysis is unfeasible.

My project builds a platform that downloads, indexes, and makes the entire historical archive of the BOC accessible. The goal is simple: anyone should be able to search the full text of any disposition published over the last four decades, with filters by date, section, issuing body, and boolean operators. And thus facilitate its analysis.

The architecture has two major blocks:

1. Data pipeline. Kestra orchestrates the hierarchical download of the archive (years, bulletins, dispositions). Raw HTML documents are stored in MinIO as a data lake. Python parsers extract the text and metadata, and DLT loads them into PostgreSQL. Metric views monitor the coverage and quality of the data at each level.

2. Web frontend. A Next.js application with TypeScript, Tailwind CSS, and Prisma that connects directly to PostgreSQL. It offers full-text search using PostgreSQL's Spanish configuration (tsvector/tsquery), semantic pagination by year-bulletin-disposition, and a metrics page that transparently shows the status of data download and extraction.

I'm the only person behind the project, so for the time being all editorial content is managed as Markdown and YAML, without a CMS.

All the infrastructure runs on Docker Compose, both the pipeline (Kestra + MinIO + PostgreSQL) and the frontend (Next.js + PostgreSQL) with support for Traefik as a reverse proxy in production.

The project is under development: it already downloads and processes bulletins, offers functional search, and displays data quality metrics in real time. I'll keep sharing updates here.

#DataEngineering #LearningInPublic #DataTalksClub #PostgreSQL #NextJS #Kestra #OpenData #CanaryIslands
