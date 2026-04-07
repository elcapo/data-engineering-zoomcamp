import argparse
import sys
from pathlib import Path

from .reader import read_file


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="document-reader",
        description="Convierte un PDF de una disposición del Boletín Oficial de Canarias a Markdown.",
    )
    parser.add_argument("pdf_file", type=Path, help="Ruta al PDF de la disposición")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="Archivo de salida Markdown (por defecto: stdout)",
    )
    args = parser.parse_args()

    if not args.pdf_file.exists():
        print(f"Error: no existe el archivo '{args.pdf_file}'", file=sys.stderr)
        sys.exit(1)

    result = read_file(args.pdf_file)

    if args.output:
        args.output.write_text(result, encoding="utf-8")
    else:
        print(result)
