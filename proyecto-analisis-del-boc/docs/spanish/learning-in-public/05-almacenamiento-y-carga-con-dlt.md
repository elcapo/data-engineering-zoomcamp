En los artículos anteriores conté cómo los parsers en Python extraen datos estructurados del HTML del BOC. Pero entre "el parser devuelve un JSON" y "los datos están en PostgreSQL listos para buscar" hay un trecho: cómo se almacenan los datos en crudo y cómo se cargan en base de datos.

El primer principio de diseño fue preservar siempre el dato original. Cada archivo descargado del BOC se guarda comprimido tal cual en MinIO, organizado en un `bucket` inmutable. Si mañana descubro un error en un parser o quiero extraer un campo nuevo, puedo reprocesar sin volver a descargar. MinIO actúa como lago de datos: barato, duradero y desacoplado de la lógica de transformación.

Tras el parseo, los documentos convertidos a Markdown se guardan en un segundo bucket (boc-markdown) con metadatos en formato YAML. Así tengo dos capas: el HTML original y la versión limpia y estructurada.

Para la carga en PostgreSQL uso DLT (Data Load Tool). Cada flujo de extracción en Kestra incluye un pequeño script en Python que define un recurso DLT con su clave primaria y ejecuta el pipeline. DLT se encarga de crear las tablas, gestionar el esquema y, lo más importante, hacer un `merge`: si reproceso un boletín, los datos se actualizan sin duplicados gracias a las claves primarias estratégicamente selecionadas.

En paralelo a la carga de datos, cada descarga y cada extracción se registran en tablas de log. Son tablas sencillas que anotan qué se ha procesado y cuándo, usando. Sobre estas tablas hay vistas SQL de métricas que cruzan lo que debería existir (según el nivel superior) con lo que realmente se ha descargado o extraído. El resultado es un porcentaje de cobertura por año y nivel.

Estas vistas son la base del sistema de seguimiento que mencioné en el artículo sobre Kestra: el flujo que consulta una vista que detecta años con huecos y lanza los rellenos necesarios. También alimentan la página de métricas del `frontend`, donde cualquier visitante puede ver el estado real de la descarga.

El patrón es simple pero efectivo: datos crudos en MinIO, datos estructurados en PostgreSQL vía DLT con merge idempotente y logs que permiten saber exactamente qué falta. Sin frameworks pesados ni infraestructura compleja.

#DataEngineering #AprendeEnPúblico #DataTalksClub #DLT #PostgreSQL #MinIO #DatosAbiertos
