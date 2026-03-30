Si en el artículo anterior hablé sobre cómo organicé los flujos de Kestra en descargas, extracciones, rellenos y seguimientos, ahora voy a hablar sobre una decisión de diseño que marcó el desarrollo del proyecto: sacar toda la lógica de extracción de los flujos de Kestra y moverla a módulos de Python independientes.

La tentación inicial era escribir los parsers directamente como scripts incrustados en los flujos YAML. Kestra lo permite y para prototipos rápidos funciona bien. Pero enseguida vi que eso tenía un problema: no podía testear la lógica de extracción sin ejecutar el flujo completo. Y cuando estás parseando HTML de una web que lleva publicando desde 1980, los tests unitarios no son un lujo, son una necesidad.

Así que escribí cada parser como un paquete Python independiente con su CLI y su API pública:

1. El `archive-parser` extrae los años del índice general a partir de su página HTML.

🔗 https://github.com/elcapo/data-engineering-zoomcamp/tree/main/proyecto-analisis-del-boc/pipeline/python/archive-parser

2. El `year-parser` extrae los boletines de un año a partir de su página HTML.

🔗 https://github.com/elcapo/data-engineering-zoomcamp/tree/main/proyecto-analisis-del-boc/pipeline/python/year-parser

3. El `issue-parser` extrae las disposiciones de un boletín a partir de su página HTML.

🔗 https://github.com/elcapo/data-engineering-zoomcamp/tree/main/proyecto-analisis-del-boc/pipeline/python/issue-parser

4. El `document-parser` convierte el HTML de cada disposición a Markdown con metadatos estructurados.

🔗 https://github.com/elcapo/data-engineering-zoomcamp/tree/main/proyecto-analisis-del-boc/pipeline/python/document-parser

5. Y el `issue-reader` extrae las disposiciones a partir de la versión en un boletín en PDF.

🔗 https://github.com/elcapo/data-engineering-zoomcamp/tree/main/proyecto-analisis-del-boc/pipeline/python/issue-reader

Cada uno recibe un archivo y devuelve datos estructurados, sin dependencias con Kestra ni con MinIO.

El beneficio inmediato fue poder testearlos de forma aislada. Cada módulo tiene su directorio de ejemplos reales y sus "fixtures" de sesión. Puedo ejecutar los tests en segundos sin levantar ningún servicio.

La ventaja real apareció cuando empecé a procesar años antiguos. La web del BOC no usa la misma estructura HTML para todas las épocas. Los boletines de 2026 tienen un DOM completamente distinto al de 1982, y hay variantes intermedias. En lugar de llenar el código de condicionales, implementé un sistema de detección de formato: cada parser registra sus variantes y el sistema prueba cuál reconoce el documento. Añadir soporte para un nuevo formato es crear una clase, escribir su test con un ejemplo real y registrarla.

Esto permitió un desarrollo gradual. El resultado: Kestra se limita a orquestar (descargar, invocar el parser, cargar el resultado) y toda la lógica de negocio vive en módulos testeados. Si mañana migro a otro orquestador, los parsers funcionan igual.

#DataEngineering #AprendeEnPúblico #DataTalksClub #Python #Testing #WebScraping #DatosAbiertos
