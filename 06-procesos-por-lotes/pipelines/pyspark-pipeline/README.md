## Instalar Spark en Linux

Vídeo original (en inglés): [Installing Spark on Linux](https://www.youtube.com/watch?v=hqUbB9c8sKg&list=PL3MmuxUbc_hJed7dXYoJw8DoCuVHhGEQb&index=53)

Apache Spark está desarrollado principalmente en Scala, un lenguaje que se ejecuta sobre la Máquina Virtual de Java (JVM) y que permite combinar programación funcional y orientada a objetos, lo que encaja muy bien con su modelo de procesamiento distribuido y su API interna. Aunque como usuarios solemos interactuar con Spark a través de PySpark o Spark SQL, por debajo el motor sigue siendo Scala, lo que explica su dependencia de Java y la necesidad de tener una JVM correctamente configurada.

Para evitar problemas de compatibilidad entre versiones de Java, Python, librerías del sistema y el propio Spark (algo especialmente habitual en instalaciones locales) he optado por una instalación dockerizada. Esto nos permite trabajar con un entorno aislado, reproducible y fácil de levantar en cualquier máquina, garantizando que todos usemos exactamente las mismas versiones y reduciendo el tiempo dedicado a tareas de configuración que no aportan valor al aprendizaje del procesamiento de datos.

### Imagen base

Como imagen base usamos la imagen oficial de Apache Spark ([apache/spark](https://github.com/apache/spark-docker)), que ya incluye Java 17, Scala 2.12 y Python 3. El `Dockerfile` del servicio Jupyter simplemente añade las librerías Python que necesitamos:

```Dockerfile
FROM apache/spark:3.5.8-scala2.12-java17-python3-ubuntu

USER root

# Librerías Python típicas en batch
RUN pip install --no-cache-dir \
    pandas \
    pyarrow \
    jupyter

WORKDIR /workspace

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

Puedes ver el fichero en contexto en [./Dockerfile](./Dockerfile).

### Servicios Dockerizados

Los servicios `spark-master` y `spark-worker` usan la imagen oficial directamente. Solo el servicio `jupyter` construye una imagen propia (a partir de la oficial) para añadir Jupyter y las librerías Python. En total instanciamos tres servicios:

* un servidor principal de Spark,
* un trabajador de Spark y
* un servidor de cuadernos Jupyter.

#### Servidor principal de Spark

El servidor principal de Spark es el que levantará, entre otras cosas, la interfaz gráfica. Por defecto, la levantará en el puerto 8080 del equipo anfitrión aunque este puerto puede ser sobreescrito mediante la variable de entorno `SPARK_MASTER_UI_PORT`. Este servicio abrirá también el puerto 7077 para comunicarse con trabajadores Spark, siendo este puerto sobreescribirble mediante la variable de entorno `SPARK_MASTER_PORT`.

La variable `SPARK_NO_DAEMONIZE=true` hace que el script de inicio mantenga el proceso en primer plano (comportamiento necesario en Docker).

```yml
spark-master:
  image: apache/spark:3.5.8-scala2.12-java17-python3-ubuntu
  container_name: spark-master
  hostname: spark-master
  environment:
    - SPARK_NO_DAEMONIZE=true
  ports:
    - "${SPARK_MASTER_UI_PORT:-8080}:8080"
    - "${SPARK_MASTER_PORT:-7077}:7077"
  command: /opt/spark/sbin/start-master.sh
  volumes:
    - ./notebooks:/workspace
```

#### Trabajador de Spark

El trabajador de Spark no requiere ninguna configuración y está preconfigurado para que se comunique con el servicio principal de Spark.

```yml
spark-worker:
  image: apache/spark:3.5.8-scala2.12-java17-python3-ubuntu
  container_name: spark-worker
  depends_on:
    - spark-master
  environment:
    - SPARK_NO_DAEMONIZE=true
  command: /opt/spark/sbin/start-worker.sh spark://spark-master:7077
  volumes:
    - ./notebooks:/workspace
```

#### Servidor de cuadernos de Jupyter

El servidor de cuadernos Jupyter está disponible por defecto en el puerto 8888 del equipo anfitrión, siendo el puerto modificable mediante la variable de entorno `JUPYTER_PORT`. Gracias a que usa nuestra imagen personalizada (basada en la oficial de Spark), tiene disponibles `pyspark`, `pandas` y `pyarrow` entre otras utilidades.

La variable de entorno `SPARK_MASTER` es leída explícitamente en el cuaderno para conectarse al cluster: `os.environ.get('SPARK_MASTER', 'local[*]')`.

```yml
jupyter:
  build: .
  container_name: spark-jupyter
  depends_on:
    - spark-master
  environment:
    - SPARK_MASTER=spark://spark-master:7077
  ports:
    - "${JUPYTER_PORT:-8888}:8888"
  command: >
    jupyter notebook
    --ip=0.0.0.0
    --allow-root
    --no-browser
    --NotebookApp.token=''
  volumes:
    - ./notebooks:/workspace
```

#### Inicio del servicio

Para iniciar los servicios, podemos ir a la carpeta en la que hemos preparado la instalación dockerizada e iniciar los servicios con Docker Compose:

```bash
docker compose up -d
```

Una vez que los servicios estén funcionando, podemos iniciar una sesión BASH en el contenedor del servicio principal:

```bash
docker compose exec spark-master bash
```

Y una vez en el contenedor podemos abrir una sesión shell de Spark:

```bash
/opt/spark/bin/spark-shell
```

Por fin, podemos hacer una prueba escribiendo código Scala.

```java
val data = 1 to 10000
// data: scala.collection.immutable.Range.Inclusive = Range 1 to 10000

val distData = sc.parallelize(data)
// distData: org.apache.spark.rdd.RDD[Int] = ParallelCollectionRDD[0] at parallelize at <console>:24

distData.filter(_ < 10).collect()
// res0: Array[Int] = Array(1, 2, 3, 4, 5, 6, 7, 8, 9)
```

![Sesión shell de Spark](../../resources/screenshots/sesion-shell-de-spark.png)
