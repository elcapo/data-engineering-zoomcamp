# Infraestructura y prerrequisitos

## Entornos virtuales

Antes de seguir hablando sobre cómo desplegar nuestras aplicaciones con Docker, vamos a hablar sobre entornos virutales y sobre `uv`, la herramienta que vamos a usar para gestionar esos entornos.

### ¿Qué es un entorno virtual y por qué lo necesitas?

Un entorno virtual es un espacio aislado donde puedes instalar paquetes de Python específicos para un proyecto sin que interfieran con otros proyectos o con las librerías instaladas globalmente en tu sistema.

Imagina que tienes dos proyectos:

- Un proyecto antiguo que usa `pandas` versión 1.5.0
- Un proyecto más reciente que usa `pandas` versión 3.0.0

Sin entornos virtuales, solo podrías tener una versión de `pandas` instalada globalmente y tendríamos un problema. Los entornos virtuales resuelven esto creando "burbujas" independientes para cada proyecto.

Además, los entornos virtuales hacen que tu proyecto sea reproducible. Cuando compartes tu código con alguien, esa persona puede recrear exactamente el mismo entorno con las mismas versiones de las librerías, evitando el famoso "en mi máquina funciona".

### ¿Por qué usar `uv`?

Tradicionalmente, en Python se usaba `venv` o `virtualenv` para crear entornos virtuales y `pip` para instalar paquetes. Esto funcionaba, pero con algunos inconvenientes: es lento, a veces genera conflictos de dependencias y la configuración puede ser complicada.

`uv` es una herramienta moderna que simplifica todo este proceso. Es extremadamente rápida, gestiona automáticamente tanto el entorno virtual como las dependencias y garantiza que todo el equipo trabaja con las mismas versiones de cada librería.

Gracias a `uv`, aún cuando distribuimos aplicaciones sin sus correspondientes contenedores Docker, conseguimos facilitar a otras personas la colaboración con nuestra aplicación.

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

**¿Qué hace este comando?**

- Crea tres ficheros: **README.md**, **main.py** y **pyproject.toml**
- Configura la estructura básica de un proyecto Python con `uv`
- El archivo **pyproject.toml** es el corazón del proyecto: define el nombre, versión, dependencias y configuración

Imagina que ya hemos añadido el contenido de nuestro script en el fichero **main.py**. Para ejecutarlo todavía tendríamos que instalar Pandas, si no lo teníamos ya. En su lugar, vamos a decirle a `uv` qué dependencias tiene este proyecto:

```bash
uv add pandas

# También podemos exigir una versión específica
uv add pandas==3.0.0
```

**¿Qué hace `uv add`?**

- Descarga e instala el paquete especificado (y todas sus dependencias)
- Actualiza el archivo **pyproject.toml** añadiendo la dependencia
- Crea o actualiza el archivo **uv.lock** que "congela" las versiones exactas de todos los paquetes
- Crea automáticamente un entorno virtual en la carpeta `.venv` si no existe

El archivo **uv.lock** es fundamental: garantiza que cualquier persona que use tu proyecto instalará exactamente las mismas versiones de todas las librerías, incluyendo las dependencias de las dependencias.

Ahora podemos lanzar nuestro script sin problemas:

```bash
uv run main.py ejemplo.csv
```

**¿Qué hace `uv run`?**

- Ejecuta el comando que le pasas usando el entorno virtual del proyecto
- Se asegura de que todas las dependencias estén instaladas antes de ejecutar
- No necesitas activar manualmente el entorno virtual (como con `source .venv/bin/activate`)

Esta es una de las grandes ventajas de `uv`: simplifica la ejecución de scripts sin necesidad de recordar activar entornos virtuales.

### Colaborando con otros desarrolladores

Si una persona que no tuviese Pandas se descargase nuestro repositorio y quisiese ejecutarlo, solo tendría que lanzar:

```bash
uv sync

# Y ya podría ejecutar
uv run main.py ejemplo.csv
```

**¿Qué hace `uv sync`?**

- Lee los archivos **pyproject.toml** y **uv.lock**
- Crea el entorno virtual si no existe
- Instala todas las dependencias con las versiones exactas especificadas en **uv.lock**
- Garantiza que todos trabajen con el mismo entorno

## Archivos importantes en un proyecto con `uv`

### pyproject.toml

Este es el archivo de configuración principal del proyecto. Contiene:

- **Metadatos del proyecto**: nombre, versión, descripción
- **Dependencias**: lista de paquetes que tu proyecto necesita
- **Configuración de Python**: versión mínima requerida
- **Configuración de herramientas**: opciones para linters, formatters, etc.

Ejemplo de un **pyproject.toml** básico:

```toml
[project]
name = "csv-summaries"
version = "0.1.0"
description = "Script para generar resúmenes de archivos CSV"
requires-python = ">=3.12"
dependencies = [
    "pandas==3.0.0",
]
```

Este archivo debe estar en Git (o en el control de versiones que uses). Es legible y editable, aunque normalmente lo modificarás usando comandos de `uv` en lugar de editarlo manualmente.

### uv.lock

Este archivo contiene las versiones exactas de cada paquete instalado, incluyendo todas las dependencias transitivas (las dependencias de tus dependencias).

Por ejemplo, si instalas `pandas`, también necesitas `numpy`, `python-dateutil`, y otros paquetes. **uv.lock** registra la versión exacta de cada uno.

**Características importantes:**

- Es un archivo generado automáticamente, no lo edites manualmente
- Debe estar en Git
- Garantiza reproducibilidad: todos instalarán las mismas versiones
- Se actualiza automáticamente cuando añades o actualizas dependencias

### .venv/

Esta carpeta contiene tu entorno virtual: una instalación aislada de Python con todos los paquetes instalados.

**Características importantes:**

- Es creada automáticamente por `uv`
- No debe estar en Git (añádela al .gitignore)
- Puede ser eliminada y recreada en cualquier momento con `uv sync`
- Puede ocupar bastante espacio

Si accidentalmente la borras, no pasa nada. Simplemente ejecuta `uv sync` y volverá a crear.

## Comandos adicionales

### Dependencias instaladas

Para ver qué paquetes tienes instalados y sus versiones:

```bash
uv pip list
```

### Eliminar una dependencia

Si ya no necesitas un paquete:

```bash
uv remove pandas
```

Esto eliminará el paquete del entorno virtual y actualizará **pyproject.toml** y **uv.lock**.

### Actualizar dependencias

Para actualizar un paquete a su última versión compatible:

```bash
uv lock --upgrade-package pandas
```

Para actualizar todas las dependencias:

```bash
uv lock --upgrade
```

### Instalar dependencias de desarrollo

Muchas veces necesitas paquetes solo para desarrollo (tests, linters, formatters) que no son necesarios para ejecutar la aplicación:

```bash
uv add --dev pytest black ruff
```

Estas dependencias se guardan en una sección separada del **pyproject.toml** y solo se instalan cuando ejecutas `uv sync` (que por defecto instala todo) o explícitamente las pides.

### Ejecutar comandos Python directamente

Puedes ejecutar código Python directamente sin crear un archivo:

```bash
uv run python -c "import pandas; print(pandas.__version__)"
```

### Trabajar con diferentes versiones de Python

`uv` puede gestionar diferentes versiones de Python. Para usar una versión específica:

```bash
uv python install 3.11
uv init --python 3.11
```

### Activar manualmente el entorno virtual

Aunque `uv run` es lo recomendado, a veces quieres activar el entorno manualmente (por ejemplo, en un IDE):

```bash
# En Linux/MacOS
source .venv/bin/activate

# En Windows
.venv\Scripts\activate
```

Para desactivar:

```bash
deactivate
```

Cuando el entorno está activado, puedes ejecutar comandos directamente sin `uv run`:

```bash
python main.py ejemplo.csv
pip list
```

## Referencia rápida de comandos

| Comando | Descripción |
|---------|-------------|
| `uv init` | Inicializa un nuevo proyecto con uv |
| `uv add <paquete>` | Añade una dependencia al proyecto |
| `uv add --dev <paquete>` | Añade una dependencia de desarrollo |
| `uv remove <paquete>` | Elimina una dependencia |
| `uv sync` | Instala todas las dependencias del proyecto |
| `uv run <comando>` | Ejecuta un comando usando el entorno virtual |
| `uv pip list` | Lista los paquetes instalados |
| `uv lock --upgrade` | Actualiza todas las dependencias |
| `uv python install <versión>` | Instala una versión específica de Python |

## Recursos adicionales

- [Documentación oficial de uv](https://docs.astral.sh/uv/)
- [Guía de migración desde pip y venv](https://docs.astral.sh/uv/guides/integration/pip/)
- [Preguntas frecuentes](https://docs.astral.sh/uv/reference/)
