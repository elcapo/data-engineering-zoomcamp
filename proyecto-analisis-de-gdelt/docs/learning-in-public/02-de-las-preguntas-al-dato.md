En mi artículo anterior sobre mi proyecto para analizar el dataset GDELT enumeré una lista de preguntas que me gustaría poder responder con el análisis. Antes de montar la infraestructura, me parece que lo más sensato es bajar un par de ficheros a mano y ver qué hay dentro. El objetivo de esta exploración inicial no era hacer análisis, sino confirmar que las preguntas que quiero resolver encajan con lo que GDELT publica.

Repaso las preguntas una a una y las conecto con lo que he encontrado:

- **¿Dónde se concentran los eventos geopolíticos ahora mismo?**

El fichero de eventos trae la longitud y latitud de la acción y el país del actor principal. Es decir, cada fila se puede pintar directamente en un mapa.

- **¿Está aumentando o disminuyendo la cobertura de un conflicto?**

Aquí entran en juego dos campos: la escala "Goldstein" (de -10 ó conflicto, a +10 ó cooperación) y número de menciones. El primero me dice el tono del evento; el segundo, cuánto se habla de él.

- **¿Qué actores son los más activos?**

En los eventos de GDELT se detallan actores por pares con su país y rol. Contar ocurrencias por ventana de tiempo es una aplicación directa de la fuente de datos.

- **¿Cómo se propagan las noticias?**

Esta pregunta la resuelve el fichero de menciones, no el de eventos. Para cada mención se detalla cuándo ocurrió el evento y cuándo lo publicó el medio. La diferencia entre ambos es, literalmente, la latencia de propagación.

- **¿Cuál es el tono predominante en ciertas coberturas?**

El fichero GKG incluye campos con información sobre el tono, así como puntuaciones positiva y negativa para cada artículo, junto con los temas que aparecen en él. Agregando por tema puedo alimentar una tabla sobre cómo se relacionan los tonos con los temas.

De este primer estudio de los ficheros me llevé dos sorpresas:

1. **El GKG es con diferencia el más pesado**

Tiene sentido porque un evento genera muchos artículos y cada artículo tiene muchas entidades pero cambia las prioridades: el cuello de botella del pipeline va a estar en el procesamiento del GKG, no en los eventos.

2. **No todos los campos que documenta GDELT me interesan**

El codebook de eventos lista más de 60 columnas; yo me quedo con unas 20. Lo mismo con el GKG. Publicar sólo lo necesario simplifica los esquemas de las tablas raw y reduce el volumen de datos que viajan.

La conclusión de esta fase es tranquilizadora: las preguntas que me planteé no son aspiracionales, están cubiertas por campos concretos del dataset. El siguiente paso es implementar un productor que descargue los tres ficheros cada 15 minutos y los publique en Kafka.

#IngenieríaDeDatos #GDELT #AnálisisExploratorio #Kafka