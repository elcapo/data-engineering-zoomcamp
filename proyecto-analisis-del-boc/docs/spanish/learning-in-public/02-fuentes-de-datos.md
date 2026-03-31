En el artículo anterior presenté mi proyecto del Data Engineering Zoomcamp: una plataforma para descargar, indexar y hacer buscable todo el archivo histórico del Boletín Oficial de Canarias. Hoy te voy a hablar sobre el primer reto real: entender y modelar las fuentes de datos.

En un proyecto de ingeniería de datos, lo primero no es elegir herramientas, es entender de dónde vienen los datos y cómo están organizados. En mi caso, la fuente es una sola: la web oficial del BOC. Pero esconde una estructura jerárquica de cuatro niveles que hay que recorrer de arriba abajo.

Todo empieza en la página de archivo, que lista los años disponibles desde 1980. Al entrar en un año concreto aparece el listado de boletines: uno por cada día de publicación, con su número y fecha. Un año típico tiene entre 150 y 250 boletines.

Aquí viene lo interesante. No puedes saber qué disposiciones existen sin antes descargar cada boletín. El índice de un boletín es la única fuente que lista sus disposiciones, organizadas por secciones y organismos emisores. Cada entrada incluye un resumen y los enlaces al texto completo. Un boletín puede tener desde unas pocas disposiciones hasta varias decenas.

Esto significa que el flujo de datos no puede ser un simple "descarga todo de una vez". Primero tiene que escanear los boletines para descubrir qué disposiciones existen y solo entonces puede descargarlas. Es una descarga jerárquica: cada nivel depende del anterior para saber qué hay en el siguiente.

El último nivel es el texto completo de cada disposición: el documento HTML con el contenido íntegro de una ley, decreto, resolución o anuncio. Es el dato de mayor valor, el que alimenta la búsqueda de texto completo y el análisis posterior.

Para poner en perspectiva el volumen: a día de hoy, el archivo del BOC contiene 223.544 disposiciones organizadas en 9.154 boletines publicados a lo largo de 47 años. No es big data pero tampoco es trivial. Son cientos de miles de documentos HTML que hay que descargar de forma respetuosa con el servidor, almacenar en crudo, parsear, convertir y cargar en base de datos. Y el volumen crece cada día hábil con un nuevo boletín.

En el flujo de datos, cada nivel se descarga como HTML sin procesar y se almacena comprimido en MinIO (el lago de datos). Después, parsers en Python extraen los datos estructurados y los enlaces al nivel siguiente. De esta forma el HTML original siempre queda preservado: si mañana cambio la lógica de extracción, puedo reprocesar sin volver a descargar.

Documentar la jerarquía, los campos disponibles en cada nivel y las dependencias entre ellos fue lo que me permitió diseñar un flujo de datos que puede ejecutarse de forma incremental sin perder datos ni sobrecargar el servidor de origen.

#DataEngineering #AprendeEnPúblico #DataTalksClub #WebScraping #ETL #DatosAbiertos #IslasCanarias