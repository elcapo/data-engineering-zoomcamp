Estoy empezando a trabajar en un proyecto para analizar en "tiempo real" el dataset GDELT (Global Database of Events, Language and Tone), que monitoriza medios de comunicación de todo el mundo.

Digo "tiempo real" entre comillas porque realmente GDELT publica cada 15 minutos tres ficheros:

- Eventos: quién hizo qué a quién, dónde y cuándo, con una escala de conflicto/cooperación.
- Menciones: cada artículo que referencia un evento, con metadatos de la fuente y tono.
- Grafo global de conocimiento (GKG): personas, organizaciones, temas y sentimiento extraídos de las noticias.

¿Qué preguntas se pueden responder con esta fuente de datos?

- ¿Dónde se concentran los eventos geopolíticos en este momento?
- ¿Está aumentando o disminuyendo la cobertura de un conflicto?
- ¿Qué actores (países, organizaciones) son los más activos?
- ¿Cómo se propagan las noticias a través de los medios globales?
- ¿Cuál es el tono predominante en ciertas coberturas mediáticas?

Para la implementación, he pensando en un stack en el que coordino Python, Redpanda (Kafka), Apache Flink, PostgreSQL, Grafana y Kestra usando Docker Compose.

El objetivo es doble: construir un flujo de datos que, a partir de la actualización periódica de GDELT, despache datos internamente en tiempo real y así familiarizarme un poco más con Kafka y Flink.

#IngenieríaDeDatos #Kafka #GDELT #TiempoReal

> Publicado en: https://www.linkedin.com/posts/carlos-capote-perez-andreu_ingenieraedadedatos-kafka-gdelt-activity-7452340735833665536-K1es