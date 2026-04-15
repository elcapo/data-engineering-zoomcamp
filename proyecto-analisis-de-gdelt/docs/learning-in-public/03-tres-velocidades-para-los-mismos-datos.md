En el artículo anterior conecté cada pregunta del proyecto con los campos concretos de GDELT que la responden. Sabiendo qué hay dentro de los ficheros y qué quiero sacar de ellos, lo siguiente es decidir cómo tratar cada cosa. En este punto, ayuda pensar que no todos los datos necesitan que los tratemos a la misma velocidad.

Me ha salido, de forma natural, una separación en tres grupos:

- **Lo que llega sin parar: flujo continuo**

GDELT publica tres ficheros nuevos cada 15 minutos. Eventos, menciones y los grafos. Si quiero saber "dónde se concentran los eventos ahora mismo" o "cómo se está propagando una noticia", no tiene sentido esperar al día siguiente para procesarlos. Estos datos entran por una cinta transportadora: los recojo, los limpio y los dejo disponibles casi al momento. Es la parte viva del sistema.

- **Lo que se calcula con calma: por lotes**

Algunas preguntas no necesitan esa inmediatez. Saber qué actores han sido los más activos esta semana, o cómo ha evolucionado el tono de un tema este último mes, son cálculos que tiene sentido hacer de vez en cuando sobre todo lo acumulado. No gano nada recalculándolos cada 15 minutos, y además son más pesados. Aquí la prioridad no es la velocidad, sino hacer las cuentas bien sobre un volumen grande.

- **Lo que se carga una sola vez: las tablas de referencia**

GDELT usa códigos por todas partes: códigos de país, códigos de tipo de evento (la famosa escala CAMEO), códigos de religión, de etnia, de grupo... Sin una tabla que traduzca esos códigos a nombres legibles, los datos son ilegibles para un humano. Pero estas tablas no cambian casi nunca. No hace falta procesarlas en continuo ni recalcularlas por lotes: se cargan una vez, se dejan quietas, y el resto del sistema las consulta cuando las necesita.

Lo interesante de este ejercicio es que la arquitectura empieza a dibujarse sola. Cada pregunta del artículo anterior cae, casi sin esfuerzo, en uno de los tres cubos. Y cada cubo pide herramientas distintas, ritmos distintos y hasta formas distintas de pensar en los errores: no es lo mismo que falle una carga puntual de referencia, que falle un cálculo semanal, que se atasque el flujo en vivo.

#IngenieríaDeDatos #GDELT #Arquitectura #TiempoReal
