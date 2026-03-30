En el artículo sobre la organización de los flujos mencioné que algunos boletines del BOC no tienen versión HTML y que había implementado extracciones directamente desde PDF. Ahora te lo cuento en detalle.

El archivo histórico del BOC abarca más de cuarenta años. Los boletines más recientes tienen un índice HTML con enlaces a cada disposición pero algunos de los más antiguos solo ofrecen el PDF completo del boletín. Cuando el sistema detecta que una página del BOC tiene enlace de descarga del PDF pero no contiene el listado HTML de disposiciones, marca ese boletín como "solo PDF" y activa un camino de extracción diferente.

Extraer estructura de un PDF no es como parsear HTML. En un HTML tienes etiquetas que dicen "esto es un encabezado" o "esto es un enlace". En un PDF solo tienes caracteres sueltos con una posición en la página, un tamaño y un nombre de fuente. No hay jerarquía, no hay semántica: hay píxeles con coordenadas.

El primer paso es agrupar esos caracteres en líneas. Los caracteres que comparten la misma posición vertical (con cierta tolerancia) forman una línea. Dentro de cada línea, se ordenan de izquierda a derecha y se concatenan para reconstruir el texto. Pero una línea de texto no es suficiente: necesitas saber qué tipo de contenido es. ¿Es un encabezado de sección? ¿Un organismo? ¿El resumen de una disposición?

Aquí es donde entra el análisis de fuentes. Para cada línea, el sistema calcula la fuente dominante y el tamaño mediano de sus caracteres. Una línea en negrita que empieza con un número romano es una sección. Una línea en cursiva es una subsección. Una línea en negrita sin número romano es un organismo. El texto normal que sigue es el resumen de la disposición. Este esquema reproduce la jerarquía visual que un lector humano interpreta de un vistazo pero lo hace carácter a carácter.

Los PDF históricos además tienen sus propias trampas. Algunos generan palabras pegadas ("AdministraciónLocal") que hay que separar detectando transiciones de minúscula a mayúscula. Otros parten palabras entre líneas con guiones ("tempo- ral") que hay que reunificar. Y los sumarios a dos columnas requieren detectar cuándo una sección se repite para saber que has pasado de la primera columna a la segunda y dejar de leer.

Como los PDF cambian de formato según la época (el de 2001 no se maqueta igual que el de 2006), el sistema usa el mismo patrón de detección que los parsers HTML: cada formato implementa un método que examina el documento y decide si sabe procesarlo. Hoy hay dos formatos reconocidos; añadir un tercero es escribir un parser nuevo sin tocar los existentes.

El resultado es que boletines que solo existían como PDF plano ahora tienen sus disposiciones indexadas en la base de datos con sección, organismo y resumen, exactamente igual que los que vienen de HTML. Para el buscador del frontend no hay diferencia: una disposición de 2001 extraída de PDF aparece junto a una de 2025 extraída de HTML y ambas son igualmente buscables.

#DataEngineering #AprendeEnPúblico #DataTalksClub #Python #PDF #PostgreSQL #DatosAbiertos #IslasCanarias
