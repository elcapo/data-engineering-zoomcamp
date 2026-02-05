# Almacenes de datos

## BigQuery por dentro

* Vídeo original (en inglés): [Internals of BigQuery](https://www.youtube.com/watch?v=eduHi1inM4s&list=PL3MmuxUbc_hJed7dXYoJw8DoCuVHhGEQb&index=27&pp=iAQB)

En la sesión de hoy vamos a hablar sobre las piezas tecnológicas fundamentales que hacen posible que BigQuery sea un data warehouse _serverless_ capaz de procesar consultas SQL sobre enormes volúmenes de datos de forma muy rápida. BigQuery no es solo una base de datos en la nube, sino una capa de abstracción construida sobre componentes internos de Google que manejan almacenamiento, computación y comunicación de forma altamente distribuida y automatizada.

### Motor de ejecución: **Dremel**

En el núcleo de BigQuery está Dremel, un motor de ejecución de consultas distribuido que divide las consultas SQL en un árbol de operaciones paralelas. Las hojas de ese árbol (_slots_) leen y procesan datos de forma concurrente, mientras que los nodos intermedios combinan resultados parciales hasta producir el resultado final. Al contar con miles de slots disponibles dinámicamente, BigQuery puede escalar de consultas pequeñas a otras que analizan terabytes o incluso petabytes de datos en segundos.

> "Dremel convierte tu consulta SQL en un árbol de ejecución. Las hojas del árbol, llamadas "ranuras", se encargan de la lectura de los datos de Colossus y de realizar los cálculos necesarios. En el ejemplo de la publicación anterior, las ranuras leen 100 mil millones de filas y verifican cada una mediante expresiones regulares."
>
> Fuente: [Dremel: The Execution Engine · BigQuery Under the Hood](https://cloud.google.com/blog/products/bigquery/bigquery-under-the-hood)

### Almacenamiento: **Colossus**

La infraestructura de almacenamiento subyacente es Colossus, el sistema de archivos distribuido de Google que sustituye al antiguo Google File System. Colossus almacena los datos en formato columnar y altamente comprimido, optimizado para lecturas analíticas eficientes.

> "BigQuery aprovecha el formato de almacenamiento en columnas y el algoritmo de compresión ColumnIO para almacenar datos en Colossus de la manera más óptima para leer grandes cantidades de datos estructurados."
>
> Fuente: [Colossus: Distributed Storage · BigQuery Under the Hood](https://cloud.google.com/blog/products/bigquery/bigquery-under-the-hood)

### Red: **Jupiter**

De la comunicación entre el motor de ejecución y el almacenamiento se ocupa una red de alta velocidad (Jupiter).

> "Además de las obvias necesidades de coordinación de recursos y recursos computacionales, las cargas de trabajo de Big Data suelen verse limitadas por el rendimiento de la red. La red Jupiter de Google puede proporcionar 1 petabit/s de ancho de banda total de bisección, lo que nos permite distribuir grandes cargas de trabajo de forma eficiente y rápida."
>
> Fuente: [Jupiter: The Network · BigQuery Under the Hood](https://cloud.google.com/blog/products/bigquery/bigquery-under-the-hood)

### Orquestación: **Borg**

Borg (el sistema de orquestación de recursos que precede a Kubernetes) gestiona la asignación de hardware y la ejecución de todos los procesos implicados en las consultas.

> "Las máquinas se bloquean, las fuentes de alimentación fallan, los conmutadores de red dejan de funcionar y una multitud de otros problemas pueden ocurrir durante la operación de un gran centro de datos de producción. Borg los evita y la capa de software se abstrae."
>
> Fuente: [Borg: Compute · BigQuery Under the Hood](https://cloud.google.com/blog/products/bigquery/bigquery-under-the-hood)

### Combinación de tecnologías

Gracias a esta combinación de tecnologías internas de Google, BigQuery puede ofrecer un servicio totalmente administrado en el que no tienes que preocuparte por configurar servidores, escalar clústeres o gestionar discos y memoria: todo se automatiza en segundo plano y se factura principalmente por los bytes procesados y el almacenamiento utilizado.

> "El valor final de BigQuery no está en el hecho de que le ofrece una escalabilidad computacional increíble, sino en que puede aprovechar esta escala para sus consultas SQL diarias, sin siquiera pensar en software, máquinas virtuales, redes ni discos."
>
> Fuente: [BigQuery: The Service · BigQuery Under the Hood](https://cloud.google.com/blog/products/bigquery/bigquery-under-the-hood)
