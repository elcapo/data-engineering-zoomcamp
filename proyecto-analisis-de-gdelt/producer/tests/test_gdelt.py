"""Tests for GDELT parsing and type coercion logic."""

import textwrap

import pytest

from gdelt import (
    _coerce,
    fetch_latest_urls,
    parse_events,
    parse_gkg,
    parse_mentions,
)


# --- _coerce ---

class TestCoerce:
    def test_empty_string_returns_none(self):
        assert _coerce("", "any_field") is None

    def test_int_field(self):
        assert _coerce("42", "num_mentions") == 42

    def test_bigint_field(self):
        assert _coerce("20260403100000", "date_added") == 20260403100000

    def test_float_field(self):
        assert _coerce("-2.5", "goldstein_scale") == pytest.approx(-2.5)

    def test_string_field(self):
        assert _coerce("USA", "actor1_code") == "USA"

    def test_invalid_int_raises(self):
        with pytest.raises(ValueError):
            _coerce("not_a_number", "num_mentions")


# --- parse_events ---

def _make_event_line(fields: dict[int, str], total: int = 61) -> str:
    """Build a tab-delimited line with specific column values."""
    cols = [""] * total
    for idx, val in fields.items():
        cols[idx] = val
    return "\t".join(cols)


class TestParseEvents:
    def test_parses_single_record(self):
        line = _make_event_line({
            0: "1234567890",
            1: "20260403",
            5: "USA",
            6: "UNITED STATES",
            7: "US",
            15: "RUS",
            16: "RUSSIA",
            17: "RS",
            28: "01",
            29: "1",
            30: "-5.0",
            31: "10",
            32: "3",
            33: "5",
            51: "4",
            52: "Moscow, Russia",
            56: "55.7558",
            57: "37.6173",
            59: "20260403100000",
            60: "http://example.com/article",
        })
        records = parse_events(line)
        assert len(records) == 1
        r = records[0]
        assert r["global_event_id"] == 1234567890
        assert r["sql_date"] == 20260403
        assert r["actor1_code"] == "USA"
        assert r["actor2_country"] == "RS"
        assert r["event_root_code"] == "01"
        assert r["quad_class"] == 1
        assert r["goldstein_scale"] == pytest.approx(-5.0)
        assert r["num_mentions"] == 10
        assert r["num_articles"] == 5
        assert r["action_geo_type"] == 4
        assert r["action_geo_name"] == "Moscow, Russia"
        assert r["action_geo_lat"] == pytest.approx(55.7558)
        assert r["action_geo_long"] == pytest.approx(37.6173)
        assert r["date_added"] == 20260403100000
        assert r["source_url"] == "http://example.com/article"

    def test_empty_fields_become_none(self):
        line = _make_event_line({0: "999", 1: "20260403"})
        records = parse_events(line)
        assert len(records) == 1
        assert records[0]["actor1_code"] is None
        assert records[0]["goldstein_scale"] is None

    def test_skips_short_lines(self):
        short_line = "\t".join(["a"] * 10)
        assert parse_events(short_line) == []

    def test_skips_blank_lines(self):
        csv = "\n\n"
        assert parse_events(csv) == []

    def test_multiple_records(self):
        lines = "\n".join([
            _make_event_line({0: "111", 1: "20260401"}),
            _make_event_line({0: "222", 1: "20260402"}),
        ])
        records = parse_events(lines)
        assert len(records) == 2
        assert records[0]["global_event_id"] == 111
        assert records[1]["global_event_id"] == 222


# --- parse_mentions ---

class TestParseMentions:
    def test_parses_single_record(self):
        cols = [""] * 15
        cols[0] = "1234567890"
        cols[1] = "20260403100000"
        cols[2] = "20260403101500"
        cols[4] = "bbc.co.uk"
        cols[13] = "-3.5"
        line = "\t".join(cols)

        records = parse_mentions(line)
        assert len(records) == 1
        r = records[0]
        assert r["global_event_id"] == 1234567890
        assert r["event_time_date"] == 20260403100000
        assert r["mention_time_date"] == 20260403101500
        assert r["mention_source"] == "bbc.co.uk"
        assert r["mention_doc_tone"] == pytest.approx(-3.5)


# --- parse_gkg ---

class TestParseGkg:
    def test_parses_tone_subfields(self):
        cols = [""] * 16
        cols[0] = "20260403100000-1"
        cols[1] = "20260403100000"
        cols[3] = "bbc.co.uk"
        cols[4] = "http://bbc.co.uk/article"
        cols[7] = "POLITICS;ECONOMY"
        cols[9] = "John Doe"
        cols[10] = "United Nations"
        cols[15] = "-2.5,3.1,5.6,1.2,0.8,0.3,450"
        line = "\t".join(cols)

        records = parse_gkg(line)
        assert len(records) == 1
        r = records[0]
        assert r["gkg_record_id"] == "20260403100000-1"
        assert r["themes"] == "POLITICS;ECONOMY"
        assert r["tone"] == pytest.approx(-2.5)
        assert r["positive_score"] == pytest.approx(3.1)
        assert r["negative_score"] == pytest.approx(5.6)
        assert r["word_count"] == 450
        assert "tone_raw" not in r

    def test_empty_tone_field(self):
        cols = [""] * 16
        cols[0] = "20260403100000-2"
        cols[1] = "20260403100000"
        cols[15] = ""
        line = "\t".join(cols)

        records = parse_gkg(line)
        assert records[0]["tone"] is None
        assert records[0]["word_count"] is None

    def test_partial_tone_field(self):
        cols = [""] * 16
        cols[0] = "20260403100000-3"
        cols[1] = "20260403100000"
        cols[15] = "-1.0,2.0"
        line = "\t".join(cols)

        records = parse_gkg(line)
        r = records[0]
        assert r["tone"] == pytest.approx(-1.0)
        assert r["positive_score"] == pytest.approx(2.0)
        assert r["negative_score"] is None
        assert r["word_count"] is None


# --- fetch_latest_urls ---

class TestFetchLatestUrls:
    def test_parses_lastupdate_format(self, monkeypatch):
        fake_body = textwrap.dedent("""\
            48976 ebf5fad8ed2e59f211b27e9e785be8ff http://data.gdeltproject.org/gdeltv2/20260403100000.export.CSV.zip
            66555 c349f402d4aea4827c6e51e228286385 http://data.gdeltproject.org/gdeltv2/20260403100000.mentions.CSV.zip
            3311301 561211ce6b0abb5fac76988fff540acb http://data.gdeltproject.org/gdeltv2/20260403100000.gkg.csv.zip
        """)

        class FakeResponse:
            status_code = 200
            text = fake_body
            def raise_for_status(self):
                pass

        monkeypatch.setattr("gdelt.requests.get", lambda *a, **kw: FakeResponse())

        urls = fetch_latest_urls()
        assert len(urls) == 3
        assert "export.CSV.zip" in urls["events"]
        assert "mentions.CSV.zip" in urls["mentions"]
        assert "gkg.csv.zip" in urls["gkg"]
