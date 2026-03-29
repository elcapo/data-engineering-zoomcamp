import argparse
import sys

from .reader import read_to_json


def main():
    parser = argparse.ArgumentParser(description="Parse BOC PDF files")
    parser.add_argument("pdf", help="Path to the BOC PDF file")
    parser.add_argument("--indent", type=int, default=4, help="JSON indentation")
    args = parser.parse_args()

    try:
        print(read_to_json(args.pdf, indent=args.indent))
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
