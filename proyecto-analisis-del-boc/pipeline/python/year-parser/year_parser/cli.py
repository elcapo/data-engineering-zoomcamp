import argparse
import json
import sys
from pathlib import Path

from .parser import parse_issue_index


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="year-parser",
        description="Extrae el listado de boletines de un año del HTML del archivo del BOC.",
    )
    parser.add_argument("html_file", type=Path, help="Ruta al archivo HTML del año")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="Archivo de salida JSON (por defecto: stdout)",
    )
    args = parser.parse_args()

    if not args.html_file.exists():
        print(f"Error: no existe el archivo '{args.html_file}'", file=sys.stderr)
        sys.exit(1)

    html = args.html_file.read_text(encoding="utf-8")
    result = json.dumps(parse_issue_index(html), ensure_ascii=False, indent=2)

    if args.output:
        args.output.write_text(result, encoding="utf-8")
    else:
        print(result)
