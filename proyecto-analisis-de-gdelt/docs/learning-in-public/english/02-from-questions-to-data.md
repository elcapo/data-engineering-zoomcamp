In my previous article about the project to analyze the GDELT dataset I listed a set of questions I'd like the analysis to be able to answer. Before building the infrastructure, the sensible thing seemed to be to download a couple of files by hand and see what was inside. The goal of this initial exploration wasn't to do analysis — it was to confirm that the questions I want to answer fit what GDELT actually publishes.

I go through the questions one by one and connect them with what I found:

- **Where are geopolitical events concentrated right now?**

The events file carries the longitude and latitude of the action and the country of the primary actor. In other words, each row can be drawn directly on a map.

- **Is coverage of a conflict increasing or decreasing?**

Two fields come into play here: the "Goldstein" scale (from -10, meaning conflict, to +10, meaning cooperation) and the number of mentions. The first tells me the tone of the event; the second, how much it is being talked about.

- **Which actors are the most active?**

GDELT events list actors in pairs, with their country and role. Counting occurrences by time window is a direct application of the source data.

- **How do news stories propagate?**

This question is answered by the mentions file, not the events file. For each mention, GDELT records when the event happened and when the outlet published the story. The difference between the two is, literally, propagation latency.

- **What is the dominant tone in certain coverage?**

The GKG file includes fields with tone information, as well as positive and negative scores for each article, along with the themes that appear in it. Aggregating by theme, I can feed a table showing how tones relate to themes.

From this first look at the files I came away with two surprises:

1. **The GKG is by far the heaviest.**

It makes sense, because one event generates many articles and each article has many entities, but it shifts the priorities: the pipeline bottleneck is going to be in processing the GKG, not the events.

2. **Not every field GDELT documents interests me.**

The events codebook lists more than 60 columns; I'll keep about 20. Same with the GKG. Publishing only what's needed simplifies the raw table schemas and reduces the volume of data that travels.

The conclusion of this phase is reassuring: the questions I set out aren't aspirational, they are covered by concrete fields in the dataset. The next step is to implement a producer that downloads the three files every 15 minutes and publishes them to Kafka.

#DataEngineering #GDELT #ExploratoryAnalysis #Kafka
