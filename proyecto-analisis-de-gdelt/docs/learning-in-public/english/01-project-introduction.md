I'm starting to work on a project to analyze the GDELT dataset (Global Database of Events, Language and Tone) in "real time". GDELT monitors news media from all over the world.

I say "real time" in quotes because what GDELT actually does is publish three files every 15 minutes:

- Events: who did what to whom, where and when, on a conflict/cooperation scale.
- Mentions: every article that references an event, with source metadata and tone.
- Global Knowledge Graph (GKG): people, organizations, themes and sentiment extracted from the news.

What questions can this data source answer?

- Where are geopolitical events concentrated right now?
- Is coverage of a conflict increasing or decreasing?
- Which actors (countries, organizations) are the most active?
- How do news stories propagate across global media?
- What is the dominant tone in certain media coverage?

For the implementation, I've been thinking about a stack where I coordinate Python, Redpanda (Kafka), Apache Flink, PostgreSQL, Grafana and Kestra using Docker Compose.

The goal is twofold: to build a data flow that, starting from GDELT's periodic update, dispatches data internally in real time and, at the same time, to get a bit more familiar with Kafka and Flink.

#DataEngineering #Kafka #GDELT #RealTime
