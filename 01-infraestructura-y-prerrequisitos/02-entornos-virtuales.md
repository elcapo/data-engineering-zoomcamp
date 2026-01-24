# Infraestructura y prerrequisitos

## Entornos virtuales

Antes de seguir hablando sobre cómo desplegar nuestras aplicaciones con Docker, vamos a hablar sobre entornos virutales y sobre `uv`, la herramienta que vamos a usar para gestionar esos entornos.

Gracias a `uv`, aún cuando distribuyamos aplicaciones Python sin sus correspondientes contenedores Docker, conseguiremos facilitar a otras personas la colaboración con nuestra aplicación.

Para ver en qué consiste esto, vamos a empezar con un caso sencillo. Imagina que usamos la librería `pandas` para leer un CSV y devolver el resumen que automático que la librería hace de un _dataset_.

```python
import sys
from os.path import isfile
import pandas as pd

csv_file = sys.argv[1]

if not isfile(csv_file):
    raise Error("Could not find the file")

df = pd.read_csv(csv_file)
print(df.describe())
```

Suponiendo que el código lo hubiésemos guardado en un archivo **csv_summary.py**, podríamos obtener el resumen de un fichero **ejemplo.csv** con:

```bash
python csv_summary.py ejemplo.csv
```

Eso sí, para que el código funcione correctamente, tendríamos que tener Pandas instalado y aquí es donde entra en juego `uv`.

## Instalación

Si todavía lo no tienes instalado, consulta la página oficial del proyecto sobre [cómo instalar **uv**](https://docs.astral.sh/uv/getting-started/installation/). En resumen:

```bash
# Si usas Linux o MacOS
curl -LsSf https://astral.sh/uv/install.sh | sh

# Si usas Windows
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

## Flujo básico de trabajo

El flujo básico de trabajo con `uv` consiste en primero crear la carpeta que contendrá nuestro proyecto.

```bash
mkdir csv_summaries
cd csv_summaries
```

Luego inicializar la carpeta como un proyecto `uv`:

```bash
uv init
```

Esto debería de crear tres ficheros: **README.md**, **main.py** y **pyproject.toml**. Imagina que ya hemos añadido el contenido de nuestro script en el fichero **main.py**. Para ejecutarlo todavía tendríamos que instalar Pandas, si no lo teníamos ya. En su lugar, vamos a decirle a `uv` qué dependencias tiene este proyecto:

```bash
uv add pandas

# También podemos exigir una versión específica
uv add pandas==3.0.0
```

Ahora podemos lanzar nuestro script sin problemas:

```bash
uv run main.py ejemplo.csv
```

Si una persona que no tuviese Pandas se descargase nuestro repositorio y quisiese ejecutarlo, solo tendría que lanzar:

```bash
uv sync
```
