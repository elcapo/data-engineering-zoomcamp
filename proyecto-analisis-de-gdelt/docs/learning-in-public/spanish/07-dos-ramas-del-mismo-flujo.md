Ya tenemos los datos entrando cada 15 minutos a Redpanda en un flujo continuo. La pregunta ahora es qué hacer con esos datos. Una opción tentadora es hacer una tubería en serie: primero un trabajo que guarde los datos en crudo y después otro que lea esas tablas ya guardadas y calcule las agregaciones. Pero eso acopla los dos pasos y obliga al segundo a esperar al primero.

La decisión fue otra: dos ramas en paralelo que cuelgan del mismo flujo de Redpanda. Cada una hace su trabajo sin enterarse de la otra.

1. **Una rama que guarda los datos tal cual.**

Consume los tres tópicos (eventos, menciones y GKG) y los escribe en Postgres sin transformarlos. Sin filtrar, agrupar, ni hacer ningún cálculo. Su único objetivo es preservar el historial completo, fila a fila, en tablas que después podemos consultar a mano, auditar o reprocesar si cambiamos de idea sobre qué queremos calcular.

2. **Ramas que agrupan por ventanas de tiempo.**

Otros trabajos leen los mismos tres tópicos, y los agrupan por ventanas temporales, escribiendo en Postgres el resultado ya calculado. Cosas como "cuántos eventos hubo en cada país en los últimos 15 minutos" o "cuál es el tono medio por tema y hora" son, en la práctica, vistas precalculadas que un panel de análisis puede dibujar al instante sin tener que recorrer millones de filas en bruto.

Que las dos ramas partan del mismo origen y no una de la otra tiene una consecuencia práctica importante: si el trabajo de guardado se atasca o lo paro para mantenimiento, las agregaciones siguen llegando a los paneles; y al revés, si me equivoco al calcular una agregación y la tengo que rehacer, los datos en bruto nunca se tocaron.

Postgres acaba con dos familias de tablas conviviendo en el mismo sitio: las "en bruto", que crecen sin parar, y las agregadas, que se reescriben conforme cierran las ventanas. Los paneles siempre miran a las segundas; las primeras son la copia de seguridad que nos da flexibilidad por si el día de mañana necesitamos añadir un agregado nuevo.

#IngenieríaDeDatos #Flink #GDELT

> Publicado en: https://www.linkedin.com/posts/carlos-capote-perez-andreu_ingenieraedadedatos-flink-gdelt-activity-7452363063036506112-HHUd