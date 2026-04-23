Todo evento que pasa por Flink lleva dos tiempos encima: el instante en el que ocurrió en el mundo real — que GDELT publica como un campo más — y el instante en el que Flink lo procesa. Decidir a cuál de los dos anclar las ventanas de agregación es una decisión que parece técnica pero tiene consecuencias reales.

Las dos opciones son:

- **Tiempo de evento** (`event time`): la ventana "14:00–14:15" contiene los eventos cuyo propio instante cae en ese intervalo, sin importar cuándo lleguen a Flink. Aunque un evento tarde tres horas en llegar, se imputa a la ventana correcta.

- **Tiempo de proceso** (`processing time` o `PROCTIME`): la ventana se abre y se cierra según el reloj del sistema. Un evento cae en la ventana "14:00–14:15" si Flink lo ve entre las 14:00 y las 14:15, independientemente de cuándo ocurriera de verdad.

En este proyecto las ventanas se anclan al tiempo de proceso. El fragmento que lo decide es tan breve como:

```
TUMBLE(TABLE kafka_events, DESCRIPTOR(proc_time), INTERVAL '15' MINUTE)
```

La decisión tiene un coste. Con tiempo de proceso:

- Si Kestra tarda en descargar el siguiente paquete de GDELT (por el retraso del índice, un reintento, lo que sea), los eventos de ese paquete se imputan a la ventana en la que llegan, no a la ventana a la que realmente pertenecen. La misma ventana "14:00–14:15" puede contener eventos de intervalos distintos del mundo real.

- Reprocesar el mismo flujo en otro momento daría ventanas distintas. La "historia" que cuenta el sistema no es del todo reconstruible.

Lo que se gana a cambio es simplicidad. Tiempo de evento implica marcas de agua (`watermarks`), reglas para decidir cuándo una ventana se considera cerrada y estrategias para lidiar con eventos tardíos. Toda esa capa de complejidad desaparece.

Por qué no hace falta: GDELT publica cada 15 minutos con una latencia pequeña y acotada (unos minutos como mucho, una vez superado el problema del índice del que hablé hace unos artículos). El objetivo no es reconstruir con precisión forense qué pasó a las 14:03:27 en Madagascar — es mostrar, sobre un panel en vivo, tendencias y volúmenes de los últimos minutos. En ese marco, que una ventana se desplace unos pocos minutos respecto a la realidad es un coste asumible.

Como seguro por si algún día hace falta el otro camino, las tablas en bruto preservan todos los tiempos originales de GDELT. Si mañana quiero agregar algo anclándolo al tiempo real, los datos están ahí.

#IngenieríaDeDatos #Flink #GDELT

> Publicado en: https://www.linkedin.com/posts/carlos-capote-perez-andreu_ingenieraedadedatos-flink-gdelt-activity-7452385668602736641-vyCI