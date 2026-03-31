En el artículo sobre infraestructura con Docker conté que los mismos ficheros Compose sirven para levantar el proyecto tanto en local como en producción. Pero tener el mismo entorno no resuelve un problema práctico: cómo mover el estado de un sitio a otro.

El proyecto descarga y procesa más de cuarenta años de boletines oficiales. Eso no se hace en una tarde. Las primeras descargas las lancé en mi portátil, donde estaba desarrollando y probando los flujos por primera vez. Cuando los flujos ya funcionaban y llegó el momento de pasar a producción, tenía dos opciones: volver a ejecutar todo desde cero en la instancia en la nube, o llevarme el trabajo ya hecho.

Así que escribí dos scripts: backup.sh y restore.sh. Cada uno recibe flags para elegir qué componentes respaldar o restaurar: la base de datos del BOC, la base de datos de Kestra, los buckets de MinIO y el almacenamiento interno de Kestra. Sin flags, se procesa todo. El backup genera un directorio con marca de tiempo y el restore pide confirmación antes de cada paso para evitar sobrescrituras accidentales.

Cada componente usa la herramienta nativa de su tecnología:

- PostgreSQL se respalda con pg_dump comprimido en gzip.
- MinIO se copia con mc mirror, que preserva la estructura de buckets y directorios.
- El almacenamiento de Kestra se copia directamente desde el volumen Docker a través de un contenedor temporal.

Todo se ejecuta contra los contenedores en marcha, sin necesidad de pararlos.

Lo que estos scripts me permitieron es algo que suena simple pero cambia la forma de trabajar: inicié las descargas en local, donde podía inspeccionar resultados, depurar errores y ajustar los parsers con ciclos cortos de feedback. Cuando todo era estable, hice un backup, lo transferí a la instancia de producción y ejecuté el restore. La instancia arrancó exactamente donde mi portátil lo había dejado: mismos datos en PostgreSQL, mismos ficheros en MinIO, mismo estado en Kestra. Y pude continuar las descargas desde el punto en que se habían quedado.

#DataEngineering #AprendeEnPúblico #DataTalksClub #Bash #Docker #Backup #DatosAbiertos #IslasCanarias
