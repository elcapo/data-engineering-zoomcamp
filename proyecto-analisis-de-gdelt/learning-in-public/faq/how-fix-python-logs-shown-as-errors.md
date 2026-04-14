# How to fix Python logs shown as Kestra error messages?

Some times you trigger a Python script from Kestra (either via a Docker, or Script task) and everything works: exit code 0, data processed, no exceptions. But every log line in the Kestra execution view is tagged **ERROR** in red, even the ones that clearly say **INFO** in the message body:

```
2026-04-13T21:51:08.829Z ERROR 2026-04-13 21:51:08,828 INFO Published 1312 records to gdelt.events
```

Those are two different severity levels in the same line! What's going on?

## The isue

This comes down to how Unix processes produce output and how Kestra interprets it:

1. **Python's `logging` module writes to `stderr` by default.** If you, for instance, call `logging.basicConfig()` without specifying a `stream` argument, the root handler sends basically everything to `stderr`.

2. **Kestra maps the two standard streams to its own log levels.** Anything the container writes to `stdout` becomes a Kestra **DEBUG** entry and anything written on `stderr` becomes **ERROR**. There is no middle ground.

The combination means that a perfectly normal **INFO** message gets written to `stderr` by Python and then labeled `ERROR` by Kestra.

## The fix

Good news is that the fix is simple: redirect Python logging to `stdout`:

```python
import sys
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    stream=sys.stdout,
)
```

That single `stream=sys.stdout` argument is enough. After the change, your informational messages will show up as **DEBUG** in Kestra.