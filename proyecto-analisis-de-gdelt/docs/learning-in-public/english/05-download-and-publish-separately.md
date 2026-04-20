With the reference tables out of the way, it was time for the most visible part of the project: downloading the GDELT files every 15 minutes. The initial idea was simple — one process that reads the list of new files, downloads them, transforms them and publishes them to Kafka in a single pass. Implementing it surfaced a wrinkle that forced me to split that process in two.

GDELT exposes, at a fixed URL, a small text file called `lastupdate.txt`. Every 15 minutes that file changes and points to the cycle's three new files. The logical thing is to read that list, take the URLs, download and publish.

The problem is that GDELT updates that index *before* the files are actually available on all of the servers that serve them. During the first few seconds — sometimes minutes — the URLs it has just published return a 404. If you query the list and fire off the download right away, many runs fail.

The solution was to split the work into two independent processes:

- **Download**: reads the index, tries to fetch each file with retries and growing waits between attempts, and writes it to disk atomically (written under a different name and, once complete, renamed to the final one).

- **Publish**: takes the files already on disk, transforms them and sends them to Kafka.

The split has two advantages. The obvious one: if the download isn't available yet, it retries without blocking anything else. The less obvious one: since a file only appears with its final name when it is complete, publishing never runs into a half-written CSV.

Also, orchestrating the two steps from the outside becomes much cleaner. Each process does a single thing and, if something fails, you know exactly what to retry.

#DataEngineering #GDELT #Kafka
