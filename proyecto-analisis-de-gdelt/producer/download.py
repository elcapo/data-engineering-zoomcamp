"""Download the three latest GDELT CSV files to a local directory.

Writes each file atomically (tmp + rename) so that partial failures never
leave a half-written CSV on disk for the publish step to pick up.
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

from gdelt import download_and_extract, fetch_latest_urls

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

OUTPUT_DIR = Path(os.getenv("OUTPUT_DIR", "/app/out"))

FILENAMES = {
    "events": "events.csv",
    "mentions": "mentions.csv",
    "gkg": "gkg.csv",
}


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    urls = fetch_latest_urls()
    logger.info("Latest GDELT URLs: %s", urls)

    for file_type, url in urls.items():
        csv_text = download_and_extract(url)
        target = OUTPUT_DIR / FILENAMES[file_type]
        tmp = target.with_suffix(target.suffix + ".tmp")
        tmp.write_text(csv_text, encoding="utf-8")
        tmp.replace(target)
        logger.info("Wrote %s (%d bytes)", target, target.stat().st_size)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        logger.exception("Download failed")
        sys.exit(1)
