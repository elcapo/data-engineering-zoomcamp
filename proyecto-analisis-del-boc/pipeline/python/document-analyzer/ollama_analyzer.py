#!/usr/bin/env python3

import logging
from typing import List, Optional
import ollama
from pydantic import BaseModel, ValidationError

MODEL = "mistral"  # ajusta según tengas descargado
MAX_RETRIES = 3

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)


# --- Esquema estructurado ---

class Entity(BaseModel):
    name: str
    type: str


class Relation(BaseModel):
    source: str
    target: str
    type: str


class ExtractionResult(BaseModel):
    entities: List[Entity]
    relations: List[Relation]
    summary: str


# --- Prompt ---

PROMPT_TEMPLATE = """Extrae del siguiente texto:

1. Entidades relevantes: ignora menciones menores y trata de estandarizar los nombres de las entidades
2. Relaciones significativas entre ellas
3. Un resumen fácil de entender: explica qué se anuncia en el texto como si fueses un experto con grandes habilidades comunicativas y estuvieses hablando con una persona joven sin formación legal

Devuelve SOLO JSON válido.

Texto:
---
{chunk}
---
"""


def build_prompt(chunk: str) -> str:
    return PROMPT_TEMPLATE.format(chunk=chunk.strip())


# --- Llamada a Ollama ---

def call_ollama(prompt: str) -> ExtractionResult:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = ollama.chat(
                model=MODEL,
                messages=[
                    {"role": "user", "content": prompt}
                ],
                format=ExtractionResult.model_json_schema(),
                options={
                    "temperature": 0.2
                }
            )

            content = response["message"]["content"]

            return ExtractionResult.model_validate_json(content)

        except ValidationError as ve:
            logging.error(f"Error validando salida (intento {attempt}): {ve}")

        except Exception as e:
            logging.warning(f"Error en llamada a Ollama (intento {attempt}): {e}")

        if attempt == MAX_RETRIES:
            raise RuntimeError("Fallo tras múltiples intentos con Ollama")

    raise RuntimeError("Error inesperado")


# --- Pipeline principal ---

def process_chunk(chunk: str) -> ExtractionResult:
    prompt = build_prompt(chunk)
    return call_ollama(prompt)


# --- CLI ---

if __name__ == "__main__":
    import sys
    import json

    if len(sys.argv) < 2:
        print("Uso: script.py <archivo.txt>")
        sys.exit(1)

    path = sys.argv[1]

    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    result = process_chunk(text)

    print(json.dumps(result.model_dump(), ensure_ascii=False, indent=2))