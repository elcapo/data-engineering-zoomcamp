import argparse
import sys
from pathlib import Path

from .parser import parse_to_json


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="boc-parser",
        description="Extrae información estructurada de un HTML del Boletín Oficial de Canarias.",
    )
    parser.add_argument("html_file", type=Path, help="Ruta al archivo HTML del BOC")
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

    result = parse_to_json(args.html_file)

    if args.output:
        args.output.write_text(result, encoding="utf-8")
    else:
        print(result)
