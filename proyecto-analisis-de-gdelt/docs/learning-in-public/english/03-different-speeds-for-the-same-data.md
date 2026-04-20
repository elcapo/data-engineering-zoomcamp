In the previous article I connected each question of the project with the specific GDELT fields that answer it. Knowing what's inside the files and what I want to get out of them, the next thing is to decide how to treat each piece. At this point, it helps to think that not all data needs to be handled at the same speed.

GDELT uses codes everywhere: country codes, event type codes (the famous CAMEO scale), religion codes, ethnicity codes, group codes... Without a table that translates those codes into readable names, the data is unreadable to a human.

But these tables barely ever change. In fact, GDELT publishes many of them inside PDF files. They don't need to be processed continuously or recomputed in batches: they are loaded once, left alone, and the rest of the system queries them when needed.

On the other hand, GDELT publishes three new files every 15 minutes. Events, mentions and the knowledge graph. Downloading them is a canonical batch process. But we want to consume them as a continuous data stream. On the one hand, so as not to overload our system processing GDELT archives which are sometimes quite large. On the other, to have an architecture that lets us open an analytics dashboard and just refresh it continuously to get a graphical view of what's happening.

What's interesting about this exercise is that the architecture starts drawing itself. Each question from the previous article falls, almost effortlessly, into one of three buckets. And each bucket calls for different tools, different rhythms and even different ways of thinking about errors: a one-off failure of a reference load is not the same as a failed weekly computation, which is not the same as the live stream getting stuck.

#DataEngineering #GDELT #Architecture #RealTime
