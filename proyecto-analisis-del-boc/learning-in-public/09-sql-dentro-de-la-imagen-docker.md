En el artículo sobre infraestructura con Docker expliqué que Kestra ejecuta sus tareas Python dentro de contenedores basados en una imagen propia del proyecto. Hoy quiero hablar de una decisión concreta dentro de esa imagen: copiar los archivos SQL junto con el código Python.

Los flujos de Kestra se definen en YAML. Dentro de cada flujo puedes escribir scripts en Python (o en otros lenguajes) que se ejecutan como tareas. Cuando mezclé SQL directamente dentro de esos scripts, me encontré con un problema predecible: las consultas quedaban enterradas entre comillas triples dentro de bloques Python que a su vez estaban dentro de ficheros YAML. Tres niveles de anidamiento para leer un "CREATE TABLE". Editar una vista significaba abrir el YAML del flujo, buscar el script Python correcto, localizar la cadena SQL y rezar para no romper la indentación.

La solución fue sacar todo el SQL a ficheros independientes. El Dockerfile del proyecto ya copiaba los módulos Python; añadir una línea para copiar también el directorio SQL fue trivial. Ahora los flujos leen los ficheros SQL desde el sistema de archivos del contenedor. El YAML del flujo solo contiene la lógica de orquestación: conectar a la base de datos, iterar sobre una lista de ficheros y ejecutarlos en orden.

Esta separación tiene varias ventajas prácticas. Puedo abrir cualquier fichero SQL con resaltado de sintaxis, autocompletado y validación del editor. Puedo probar una consulta copiándola directamente en un cliente de PostgreSQL sin extraerla de ningún sitio. Y cuando necesito cambiar una vista, edito un fichero .sql y reconstruyo la imagen, sin tocar los flujos.

La misma estrategia me permitió crear dos trabajos auxiliares que resultaron fundamentales:

1. El primero prepara la base de datos: crea los esquemas, las tablas de seguimiento y las vistas que calculan la cobertura del pipeline. Al usar sentencias idempotentes, es seguro reejecutar este trabajo en cualquier momento y sirve tanto para la puesta en marcha inicial como para aplicar cambios de esquema.

2. El segundo trabajo mantiene actualizados los catálogos de secciones y organismos, recalculándolos a partir de los datos ya extraídos.

Ambos trabajos son simplemente listas ordenadas de ficheros SQL que se ejecutan en secuencia, algo que resulta fácil de leer y de mantener precisamente porque cada consulta vive en su propio fichero.

El principio detrás de todo esto es mantener cada lenguaje en su sitio. YAML para la orquestación, Python para la lógica de procesamiento, SQL para las consultas. Cuando respetas las fronteras entre lenguajes, cada parte del sistema se vuelve más fácil de leer, de probar y de cambiar de forma independiente.

#DataEngineering #AprendeEnPúblico #DataTalksClub #Docker #SQL #PostgreSQL #Kestra #DatosAbiertos
