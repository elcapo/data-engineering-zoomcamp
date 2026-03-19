from abc import ABC, abstractmethod

from bs4 import BeautifulSoup


class FormatParser(ABC):
    @classmethod
    @abstractmethod
    def detect(cls, soup: BeautifulSoup) -> bool:
        """Return True if this parser can handle the given HTML."""
        ...

    @abstractmethod
    def parse(self, soup: BeautifulSoup) -> dict:
        """Parse the HTML and return a structured dict."""
        ...
