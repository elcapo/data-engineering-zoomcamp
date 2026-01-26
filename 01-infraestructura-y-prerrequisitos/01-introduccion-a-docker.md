# Infraestructura y prerrequisitos

## Introducción a Docker

* Vídeo original (en inglés): [Docker for Data Engineering](https://www.youtube.com/watch?v=lP8xXebHmuE)
* Notas originales (en inglés): [Introduction to Docker](https://github.com/DataTalksClub/data-engineering-zoomcamp/blob/main/01-docker-terraform/docker-sql/01-introduction.md)

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

## Ejecutar contenedores con `docker run`

En el ejemplo anterior vimos cómo usar Docker para obtener una instalación funcional de una versión determinada de Python. Pero Docker no solo permite empaquetar las dependencias de nuestra aplicación, sino nuestra aplicación misma.

El ejemplo más rápido, típico y sencillo, es el de la aplicación **hello-world**, que puedes instalar y ejecutar con:

```bash
docker run hello-world
```

Fíjate que:

* Si ejecutas el comando por primera vez, verás cómo la imagen se descarga desde los servidores de Docker y luego el programa es inmediatamente ejecutado.
* Si lo ejecutas más veces, verás que el comando responde más rápido porque la imagen ya ha sido descargada y el programa se ejecuta de inmediato.

### Sistemas operativos

La habilidad de Docker de contener dependencias llega al punto de que cada imagen puede contener en la práctica un sistema operativo entero. Por ejemplo, aún habiendo instalado Docker en MacOS, o Windows, puedes levantar un contenedor con una línea de comandos con un Ubuntu funcional (eso sí, sin interfaz gráfica).

```bash
docker run -it --rm ubuntu bash
```

> [!NOTE]
> En la práctica, los contenedores Docker cumplen un papel parecido al de una **máquina virtual**: permiten ejecutar aplicaciones de forma aislada del sistema principal. La diferencia clave es que no necesitan reservar hardware de forma exclusiva (como ocurre con una máquina virtual).
> 
> En lugar de virtualizar todo un sistema operativo, los contenedores comparten el núcleo del sistema anfitrión y utilizan sus recursos (memoria, disco y procesador) de forma dinámica. Esto los hace más ligeros y eficientes: se inician más rápido, consumen menos recursos y permiten ejecutar más aplicaciones en el mismo equipo.

### Modificadores

Fíjate que en los casos en que hemos usado `docker run` hasta ahora, lo hemos acompañado de modificadores. En el primer caso, cuando usamos la imagen de Python y le pasamos vía "pipe" el código Python que queríamos que interpretase, usamos:

* `-i` (ó `--interactive`): Indica que la entrada estándar de la aplicación debe estar abierta porque la aplicación del contenedor necesita datos que le vas a pasar vía terminal (como es el código Python en nuestro ejemplo).

* `--rm`: Indica que queremos un contenedor de "usar y tirar", no uno del que quede rastro permanente en nuestro equipo una vez finalice.

* `-t` (ó `--tty`): Indica que quieres abrir una terminal en el contenedor. En nuestro caso, usamos este comando junto a `-i` (puedes usar los dos comandos con `-it` ó con `-ti` indistintamente).

Otros modificadores que no hemos visto pero usaremos durante el curso son:

* `-d` (ó `--detach`): Indica que quieres que el contenedor siga trabajando en segundo plano. Útil sobre todo cuando inicias un contenedor que sirve una aplicación web que debe quedar funcionando hasta que la detengamos explícitamente.

* `-p [port]` (ó `--publish [port]`): Indica que quieres publicar los puertos indicados de forma que sean accesibles desde el host. Si, por ejemplo, estás levantando un contenedor que sirve una aplicación en su puerto 80 y quieres que sea disponible desde el puerto 8080 del host, añadirías `-p 8080:80`.

* `--entrypoint [path]`: Indica que quieres que al invocar el contenedor se ejecute un programa determinado, en lugar del que la imagen tiene asignado por defecto.

Un ejemplo práctico de esto último es el siguiente comando, que inicia un servidor Apache accesible desde el puerto 8080 del host:

```bash
docker run -d -p 8080:80 --name apache httpd
```

> [!NOTE]
> En cuanto empezamos a lanzar servicios, aunque sea de pruebas, tenemos que tener en cuenta que estamos ocupando disco duro del host para, al menos, las imágenes que nos estamos descargando y los contenedores que estamos levantando con ellas.
>
> Puedes pensar en las imágenes como plantillas, o recetas que indican cómo crear un contenedor y que tienen toda la información "comprimida" necesaria para hacerlo. Y puedes pensar en los contenedores como las instancias reales de los servicios.

## Administrar contenedores

### Listar contenedores con `docker ps`

Además de ocupar espacio en el disco duro, los contenedores Docker también pueden estar reservando algunos puertos, como el 8080 en el ejemplo anterior. Por lo que resulta necesario que podamos ver con facilidad qué contenedores están corriendo en un host. Para eso tenemos el comando:

```bash
docker ps
```

#### Modificadores

Igual que con otros comandos, `docker ps` también acepta modificadores que nos permiten cambiar su comportamiento:

* `-a` (ó `--all`): Indica que quieres ver todos los contenedores, incluso los que están parados.

* `-q` (ó `--quiet`): Indica que solo quieres ver los identificadores de los contenedores.

```bash
docker ps -a
```

Si lanzásemos este comando en un host en el que únicamente tuviésemos el contenedor Apache que levantamos en el apartado anterior, veríamos algo más o menos así:

```
docker ps
CONTAINER ID   IMAGE   COMMAND              CREATED          STATUS          PORTS                                      NAMES
183fc3f0b910   httpd   "httpd-foreground"   11 minutes ago   Up 11 minutes   0.0.0.0:8880->80/tcp, [::]:8880->80/tcp    apache
```


Y si quisiésemos obtener únicamente el identificador del contenedor para usarlo como entrada de otro comando, podríamos escribir:

```bash
docker ps -aq
```

> 183fc3f0b910

Recuerda que los modificadores que no requiren argumentos adicionales puedes combinarlos con un único guión. En cualquier caso, el comando anterior es equivalente a:

```bash
docker ps -a -q

# que es lo mismo que
docker ps --all --quiet
```

### Detener contenedores con `docker stop`

En cualquier momento puedes detener contenedores con `docker stop` seguido del identificador del contenedor que quieres detener. Puedes añadir varios identificadores separados por espacios o saltos de línea para detenerlos con un único comando.

```bash
docker stop 183fc3f0b910
```

Un uso típico del modificador `-q` es en un comando que está dentro de otro y que devuelve los identificadores que querrías poner a mano. Si, por ejemplo, quisieses detener todos los contenedores activos, podrías ejecutar:

```bash
docker stop $(docker ps -q)
```

### Eliminar contenedores con `docker rm`

Si una vez detenido un contenedor sabes que no vas a volver a usarlo y quieres eliminarlo para liberar espacio en el disco duro del host, puedes hacerlo con:

```bash
docker rm 183fc3f0b910
```

El "truco" de concatenar `$(docker ps -q)` también funcionaría aquí.

## Volúmenes

A priori, lo que pasa dentro de un contenedor queda en el contenedor. Si en una sesión en un contenedor Ubuntu lanzas un comando que borra todos los ficheros desde la carpeta raíz, puede que rompas el contenedor, pero no estarás rompiendo el equipo en el que corre Docker.

Esto gira en torno a una idea importante: los contenedores no tienen estado. Son una versión viva, en ejecución, de una imagen. Lo que significa que dos contenedores de Ubuntu son prácticamente idénticos.

Entonces, ¿no podemos guardar archivos en un contenedor? Sí, hay varias maneras pero la más importante son los volúmenes de Docker.

El caso más sencillo de volumen de Docker es el de la conexión de una carpeta del host con una carpeta del contenedor. Por ejemplo, puedes crear una carpeta `app/` con las fuentes de tu aplicación y levantar un contenedor con acceso a esa carpeta.

```bash
# Aquí asumimos que la carpeta `app` está en el mismo directorio
# desde el que estamos lanzando los comandos
docker run -it --rm -v $(pwd)/app:/app python
```

Si en nuestra carpeta hubiésemos creado un script con permisos de ejecución **python-version.py**:

```python
#!/bin/env python
import sys
print(f"Este programa está siendo ejecutado por Python en su versión:\n{sys.version}")
```

Podríamos usarlo como punto de entrada del contenedor:

```bash
docker run -it --rm -v $(pwd)/app:/app --entrypoint=/app/python-version.py python
```

> Este programa está siendo ejecutado por Python en su versión:
> 3.14.2 (main, Jan 13 2026, 05:57:24) [GCC 14.2.0]
