# Orquestación de flujos de datos

## Introducción a Kestra

### Qué es la orquestación de flujos de datos

* Vídeo original (en inglés): [What is Workflow Orchestration?](https://www.youtube.com/watch?v=-JLnp-iLins&list=PLEK3H8YwZn1p-pCYj46rRhA0HcdXXxzzP&index=1&pp=iAQB)

En un entorno de ingeniería de datos, los flujos de datos suelen involucrar tareas como extracción, transformación y carga de datos. La orquestación se encarga de asegurar que cada tarea se ejecute cuando debe, que comparta su salida con quienes la necesitan y que todo el flujo sea observable y reproducible.

Que un flujo de datos sea observable significa que podemos ver, entender y diagnosticar fácilmente qué está pasando dentro de él mientras se ejecuta o después de haberse ejecutado. En la práctica, esto implica disponer de información clara sobre si cada tarea se ha ejecutado correctamente, cuánto tiempo ha tardado, qué datos ha producido y en qué punto ha fallado si ocurre un error.

La observabilidad se apoya en elementos como registros, métricas y estados de ejecución, que permiten responder preguntas como: ¿se ha completado el flujo? ¿qué paso está fallando? ¿desde cuándo ocurre? ¿con qué datos?

En el contexto de la orquestación de flujos de datos, la observabilidad es clave porque convierte un proceso automático en un sistema controlable y depurable, facilitando el mantenimiento y aumentando la confianza en que los datos generados son correctos y reproducibles.

### Qué es Kestra

* Vídeo original (en inglés): [What is Kestra?](https://www.youtube.com/watch?v=ZvVN_NmB_1s&list=PLEK3H8YwZn1p-pCYj46rRhA0HcdXXxzzP&index=2&pp=iAQB)

Kestra es un orquestador de flujos de datos de código abierto diseñado para facilitar la creación, ejecución y supervisión de pipelines de datos de forma escalable y mantenible. Su objetivo principal es coordinar tareas que forman parte de un proceso de tratamiento de datos, asegurando que se ejecuten en el orden correcto y gestionando dependencias, errores y reintentos de manera automática.

Kestra ofrece varias formas de definir los flujos de trabajo:

- mediante código (por ejemplo, usando archivos declarativos),
- a través de interfaces visuales que permiten un enfoque no-code y
- o incluso apoyándose en herramientas basadas en Inteligencia Artificial para asistir en su diseño.

Y lo que es mejor, puedes cambiar entre estas formas de trabajo en cualquier momento. Esta flexibilidad permite adaptarse tanto a perfiles técnicos como a usuarios con menos experiencia en programación, facilitando la adopción progresiva de la orquestación de flujos de datos en distintos contextos.

#### Inicio de los flujos de datos

Kestra soporta tanto ejecuciones basadas en la programación de tareas, como ejecuciones desencadenadas por eventos. Lo que significa que puedes iniciar tareas en momentos determinados (ej. una vez al día), o que se disparen automáticamente cuando llegan datos a un cierto almacén de datos.
