# uv run --with beautifulsoup4 python

from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import re

base_url = "https://www.gobiernodecanarias.org/boc/archivo/"

def is_absolute(url: str) -> bool:
    parsed = urlparse(url)
    return parsed.scheme and parsed.netloc

def get_year_from_link(link):
    pattern = re.compile(base_url + r'(\d{4}|$)')
    occurrences = pattern.findall(link)
    if len(occurrences) >= 0:
        return occurrences[0]

def get_year_links_from_html(html: str):
    soup = BeautifulSoup(html, "html.parser")

    year_links = {}

    for link in soup.find_all("a"):
        if not link.has_attr("href"):
            continue

        absolute_link = link["href"] if is_absolute(link["href"]) else str(urljoin(base_url, link["href"]))
        if not absolute_link.startswith(base_url):
            continue

        year = get_year_from_link(absolute_link)
        if not year:
            continue

        year_links[year] = {
            "text": link.text,
            "link": absolute_link,
        }

    return year_links

def get_year_links_from_file(file: str):
    with open(file, "r") as f:
        html = f.read()

    return get_year_links_from_html(html)

get_year_links_from_file("data/raw/boc/archive.html")
