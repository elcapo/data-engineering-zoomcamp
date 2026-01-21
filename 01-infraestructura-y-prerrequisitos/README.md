# Zoomcamp de ingeniería de datos

## Introducción a Docker

Docker es una herramienta que permite empaquetar aplicaciones junto con todo lo que necesitan para funcionar en _contenedores_. Estos contenedores pueden ejecutarse de forma consistente en distintos entornos, desde el ordenador de una persona desarrolladora hasta servidores en producción. Gracias a Docker, se reducen los problemas de "en mi máquina funciona" y se facilitan tanto el desarrollo como el despliegue y mantenimiento de aplicaciones.

## Instalación

La instalación de Docker es diferente según en qué contexto vas a usarlo. Para empezar, echa un vistazo a la página de la documentación oficial dedicada a la instalación del [Motor de Docker](https://docs.docker.com/engine/install/). Ahí encontrarás instrucciones diferentes según el sistema en el que vas a hacer la instalación:

* [CentOS](https://docs.docker.com/engine/install/centos/)
* [Debian](https://docs.docker.com/engine/install/debian/)
* [Fedora](https://docs.docker.com/engine/install/fedora/)
* [Raspberry Pi OS](https://docs.docker.com/engine/install/raspberry-pi-os/)
* [Red Hat Enterprise Linux](https://docs.docker.com/engine/install/rhel/)
* [SUSE Linux Enterprise Server](https://docs.docker.com/engine/install/sles/)
* [Ubuntu](https://docs.docker.com/engine/install/ubuntu/)

En caso de que vayas a hacer la instalación en un Windows o MacOS, ve a la sección de binarios:

* [Windows](https://docs.docker.com/engine/install/binaries/#install-server-and-client-binaries-on-windows)
* [MacOS](https://docs.docker.com/engine/install/binaries/#install-client-binaries-on-macos)

Como las instrucciones son diferentes según el ordenador en el que vas a hacer la instalación, en el curso no entraremos en detalles y asumiremos que has conseguido seguir los pasos. No dudes en consultar con tu IA de confianza si tienes cualquier problema durante la instalación.

Sabrás que tienes Docker instalado porque podrás lanzar desde tu **terminal** el comando:

```bash
docker --version
```

... y obtener la versión de Docker que tienes instalada, algo así como:

> Docker version 28.2.1, build 879ac3f

## Primeros pasos

### El problema

Ahora que ya tienes Docker instalado, vamos a ver en qué consiste eso de que puedes empaquetar una aplicación con sus dependencias para facilitar su distribución. Imagina que tenemos este ínfimo programa Python:

```py
import sys
print(sys.version)
```

Es un programa que se limita a escribir la versión de Python en uso. Si escribimos un comando que lo compacta en una única línea y lo escribe:

```bash
echo "import sys\nprint(sys.version)"
```

... podremos pasárselo a un intérprete de Python:

```bash
echo "import sys\nprint(sys.version)" | python
```

... y obtener por la terminal la versión de Python que estamos usando:

> 3.13.7 (main, Jan  8 2026, 12:15:45) [GCC 15.2.0]

Esto significa que en mi equipo estoy usando Python 3.13.7. Ahora, imagina que me piden ayuda para colaborar con un proyecto en el que están usando una versión diferente, por ejemplo, Python 3.9.16. Una opción es tratar de mantener varias versiones de Python simultáneamente en mi equipo, pero esto puede hacerlo inestable.

### La solución

Ahora que tenemos Docker, podemos usar sus imágenes para usar versiones específicas de programas sin tener que instalarlas "contaminando" nuestro sistema. Por ejemplo, reemplazando la llamada a `python` de nuestro último comando por una llamada a `docker run...` podemos conseguir el efecto deseado.

```bash
echo "import sys\nprint(sys.version)" | docker run -i --rm python:3.9.16
```

... y trabajar con la versión de Python que necesitamos sin tener que cambiar la que tenemos instalada en nuestro equipo:

> 3.9.16 (main, May 23 2023, 14:17:54) 
> [GCC 10.2.1 20210110]

Más adelante veremos cómo podemos definir y orquestar entornos en los que definimos qué dependencias tiene un programa, pudiendo especificar explícitamente las versiones de cada una de ellas.