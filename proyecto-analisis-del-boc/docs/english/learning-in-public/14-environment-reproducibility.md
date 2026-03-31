In the article about infrastructure with Docker I mentioned that the same Compose files work for spinning up the project both locally and in production. But having the same environment doesn't solve a practical problem: how to move state from one place to another.

The project downloads and processes more than forty years of official bulletins. That doesn't happen in an afternoon. I launched the first downloads on my laptop, where I was developing and testing the flows for the first time. When the flows were working and it was time to move to production, I had two options: re-run everything from scratch on the cloud instance, or take the work already done with me.

So I wrote two scripts: backup.sh and restore.sh. Each one accepts flags to choose which components to back up or restore: the BOC database, the Kestra database, the MinIO buckets, and Kestra's internal storage. Without flags, everything is processed. The backup generates a directory with a timestamp, and the restore asks for confirmation before each step to avoid accidental overwrites.

Each component uses the native tool for its technology:

- PostgreSQL is backed up with pg_dump compressed in gzip.
- MinIO is copied with mc mirror, which preserves the bucket and directory structure.
- Kestra's storage is copied directly from the Docker volume through a temporary container.

Everything runs against the running containers, without needing to stop them.

What these scripts allowed me to do is something that sounds simple but changes the way you work: I started the downloads locally, where I could inspect results, debug errors, and adjust the parsers with short feedback cycles. When everything was stable, I ran a backup, transferred it to the production instance, and ran the restore. The instance started up exactly where my laptop had left off: same data in PostgreSQL, same files in MinIO, same state in Kestra. And I could continue the downloads from the point where they had stopped.

#DataEngineering #LearningInPublic #DataTalksClub #Bash #Docker #Backup #OpenData #CanaryIslands
