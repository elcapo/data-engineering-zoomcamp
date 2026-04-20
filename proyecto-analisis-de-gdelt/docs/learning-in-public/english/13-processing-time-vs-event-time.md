Every event that goes through Flink carries two times on its back: the instant it happened in the real world — which GDELT publishes as just another field — and the instant Flink processes it. Deciding which of the two to anchor aggregation windows to is a decision that looks technical but has real consequences.

The two options are:

- **Event time** (`event time`): the "14:00–14:15" window contains events whose own instant falls inside that interval, regardless of when they reach Flink. Even if an event takes three hours to arrive, it is charged to the correct window.

- **Processing time** (`processing time` or `PROCTIME`): the window opens and closes according to the system clock. An event falls in the "14:00–14:15" window if Flink sees it between 14:00 and 14:15, regardless of when it actually happened.

In this project windows are anchored to processing time. The fragment that decides it is as brief as:

```
TUMBLE(TABLE kafka_events, DESCRIPTOR(proc_time), INTERVAL '15' MINUTE)
```

The decision has a cost. With processing time:

- If Kestra is late downloading the next GDELT batch (because of the index delay, a retry, whatever), the events in that batch are charged to the window in which they arrive, not to the window they truly belong to. The same "14:00–14:15" window can contain events from different real-world intervals.

- Reprocessing the same stream at another moment would produce different windows. The "history" the system tells is not entirely reproducible.

What you gain in exchange is simplicity. Event time implies watermarks, rules to decide when a window is considered closed, and strategies for dealing with late events. That entire layer of complexity goes away.

Why it isn't needed: GDELT publishes every 15 minutes with a small and bounded latency (a few minutes at most, once the index issue I talked about a few articles ago is past). The goal is not to reconstruct with forensic precision what happened at 14:03:27 in Madagascar — it is to show, on a live dashboard, trends and volumes from the last few minutes. In that framing, a window being a few minutes off from reality is an acceptable cost.

As insurance in case the other path is ever needed, the raw tables preserve all of GDELT's original times. If tomorrow I want to aggregate something anchored to real time, the data is there.

#DataEngineering #Flink #GDELT
