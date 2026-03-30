En artículos anteriores presenté el proyecto y las fuentes de datos del BOC: una jerarquía de cuatro niveles donde cada nivel hay que escanearlo para descubrir qué hay en el siguiente. Hoy toca hablar de cómo he organizado los flujos en Kestra para recorrer esa jerarquía.

Los flujos se agrupan en cuatro categorías: descargas, extracciones, rellenos y seguimientos.

Las descargas son flujos atómicos. Cada uno descarga un único recurso del sitio web del BOC y lo almacena comprimido en MinIO. Antes de descargar comprueban si el archivo ya existe, así que son seguros de re-ejecutar. Al terminar, cada descarga lanza automáticamente la extracción correspondiente como subflujo.

Las extracciones toman el HTML crudo de MinIO, lo parsean con herramientas en Python y cargan los datos estructurados en PostgreSQL. Como en ocasiones el BOC no publica versión HTML, también implementé extracciones que funcionan directamente a partir de los documentos PDF, pero este tema lo dejo para el próximo artículo.

Los rellenos fueron la decisión de diseño más interesante. Kestra tiene soporte nativo para rellenos de datos basados en programaciones: defines un cron y Kestra puede ejecutarlo retroactivamente para fechas pasadas. Pero las fuentes del BOC no encajan en ese modelo. Los boletines no siguen un calendario fijo (no se publican en festivos ni fines de semana) y su numeración tiene saltos. Intentar mapear eso a un cron habría sido frágil y confuso.

En su lugar, diseñé los rellenos como bucles explícitos para los que puedo especificar, por ejemplo, un rango de años y que disparan las descargas y extracciones correspondientes.

La ventaja es doble. Primero, la carga cognitiva baja drásticamente: un relleno es simplemente "descarga del boletín 1 al 250 del año 2024", no "simula que este cron se ejecutó 250 veces en fechas pasadas". Segundo, al reutilizar los mismos flujos de descarga atómicos, los rellenos heredan gratis la comprobación de existencia y la extracción automática.

El último grupo son los seguimientos. En estos trabajos se consulta una vista de PostgreSQL que detecta años con descargas o extracciones pendientes y lanza los rellenos necesarios. Si una descarga falló o se añadieron boletines a un año ya procesado, el seguimiento lo corrige sin intervención manual.

Por encima de todo hay un único flujo programado que se ejecuta a medianoche para importar automáticamente las nuevas publicaciones.

El resultado es un pipeline que distingue entre operación diaria (programación + seguimientos) y carga inicial o correctiva (rellenos manuales), reutilizando los mismos bloques básicos.

#DataEngineering #AprendeEnPúblico #DataTalksClub #Kestra #ETL #Orquestación #DatosAbiertos
