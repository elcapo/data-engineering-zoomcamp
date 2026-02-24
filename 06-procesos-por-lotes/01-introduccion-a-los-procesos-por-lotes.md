# Procesamiento por lotes

## Introducción a los procesos por lotes

* Vídeo original (en inglés): [Introduction to Batch processing](https://www.youtube.com/watch?v=dcHe5Fl3MF8&list=PL3MmuxUbc_hJed7dXYoJw8DoCuVHhGEQb&index=52)

Hay muchas maneras de procesar datos pero dos estrategias destacan: procesamiento por lotes y procesamiento en tiempo real. Este módulo lo dedicaremos al procesamiento por lotes y el próximo al procesamiento en tiempo real.

### ¿Qué es el procesamiento por lotes?

El procesamiento por lotes (en inglés, batch processing) en ingeniería de datos es un modelo en el que grandes volúmenes de datos se recopilan durante un período de tiempo y se procesan juntos en una sola ejecución programada, en lugar de procesarse de forma continua o en tiempo real. Este enfoque se utiliza para tareas como la limpieza de datos, transformaciones masivas, generación de reportes, cargas en almacenes de datos y cálculos históricos, donde la inmediatez no es crítica.

Los sistemas de procesamiento por lotes suelen ejecutarse en horarios definidos (por ejemplo, cada hora, cada noche) y están optimizados para manejar alta capacidad y eficiencia en el uso de recursos, aprovechando herramientas como Hadoop o Apache Spark. Aunque introduce latencia entre la generación del dato y su disponibilidad, permite procesar grandes cantidades de información de forma confiable, reproducible y a menor costo computacional.

### ¿Cómo se inician?

Aunque hay muchas maneras de iniciar los procesos por lotes, la más típica es programarlos para que su ejecución sea periódica. Por ejemplo:

* semanal
* diaria
* horaria
* _x_ veces por hora
* cada _x_ minutos

Esta programación suele gestionarse mediante orquestadores, que permiten definir dependencias entre tareas, controlar reintentos ante fallos, parametrizar ejecuciones y mantener trazabilidad de los procesos. En estos casos, el disparador del proceso no es la llegada de un evento concreto, sino el cumplimiento de una ventana temporal, lo que facilita trabajar con datos completos y consistentes (por ejemplo, *"procesar todas las ventas del día anterior"*).

También es común que los procesos se inicien al detectarse la disponibilidad de nuevos datos en un sistema de almacenamiento (como la llegada de archivos a un lago de datos) o al finalizar otros flujos de datos, formando así **cadenas de procesamiento desacopladas y reproducibles**.

### ¿Qué tecnologías se usan en estos procesos?

En el procesamiento por lotes intervienen diversas tecnologías que permiten extraer, transformar y cargar grandes volúmenes de datos de forma eficiente. **Python** es uno de los lenguajes más utilizados por su versatilidad y su ecosistema de librerías.

**SQL** sigue siendo fundamental para la manipulación y consulta de datos estructurados, especialmente en almacenes de datos y motores analíticos, donde permite expresar transformaciones de forma declarativa y optimizada.

Por su parte, **Apache Spark** se emplea cuando el volumen, la velocidad o la complejidad del procesamiento requieren ejecución distribuida, posibilitando trabajar con terabytes o petabytes de datos sobre clusters.

Estas herramientas suelen combinarse dentro de flujos de datos orquestados, donde cada una aporta sus fortalezas según la etapa del procesamiento y las necesidades de escalabilidad y rendimiento.

#### ¿Qué papel juegan los orquestadores de datos?

Los orquestadores de datos (como **Kestra**, ó **Apache Airflow**) cumplen un papel central en los procesos por lotes, ya que se encargan de coordinar y automatizar la ejecución de los distintos pasos de un proceso de datos.

En lugar de lanzar scripts de forma aislada, el orquestador define el flujo completo como un grafo de tareas con dependencias, gestiona la planificación temporal, controla reintentos ante fallos, maneja parámetros, almacena metadatos de ejecución y proporciona observabilidad (logs, métricas, estados).

Esto permite construir pipelines reproducibles, tolerantes a fallos y fáciles de mantener, además de facilitar prácticas clave en ingeniería de datos como el versionado, el relleno de datos históricos y la ejecución en distintos entornos (desarrollo, staging, producción).

![Esquema genérico de un proceso por lotes](resources/charts/esquema-generico-de-un-proceso-por-lotes.png)
