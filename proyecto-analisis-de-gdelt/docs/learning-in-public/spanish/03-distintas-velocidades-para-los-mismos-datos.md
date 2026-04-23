En el artículo anterior conecté cada pregunta del proyecto con los campos concretos de GDELT que la responden. Sabiendo qué hay dentro de los ficheros y qué quiero sacar de ellos, lo siguiente es decidir cómo tratar cada cosa. En este punto, ayuda pensar que no todos los datos necesitan que los tratemos a la misma velocidad.

GDELT usa códigos por todas partes: códigos de país, códigos de tipo de evento (la famosa escala CAMEO), códigos de religión, de etnia, de grupo... Sin una tabla que traduzca esos códigos a nombres legibles, los datos son ilegibles para un humano.

Pero estas tablas no cambian casi nunca. De hecho, GDELT publica muchas de ellas en archivos PDF. No hace falta procesarlas en continuo ni recalcularlas por lotes: se cargan una vez, se dejan quietas, y el resto del sistema las consulta cuando las necesita.

Por otro lado, GDELT publica tres ficheros nuevos cada 15 minutos. Eventos, menciones y los grafos. Descargarlos es un proceso canónico por lotes. Pero queremos consumirlos como un flujo contínuo de datos. Por un lado, para no sobrecargar nuestro sistema procesando los archivos de GDELT que, en ocasiones son bastante grandes. Por otro, para tener una arquitectura que nos permita abrir un panel de análisis de datos y simplemente refrescarlo contínuamente para tener una vista gráfica de qué está pasando.

Lo interesante de este ejercicio es que la arquitectura empieza a dibujarse sola. Cada pregunta del artículo anterior cae, casi sin esfuerzo, en uno de los tres cubos. Y cada cubo pide herramientas distintas, ritmos distintos y hasta formas distintas de pensar en los errores: no es lo mismo que falle una carga puntual de referencia, que falle un cálculo semanal, que se atasque el flujo en vivo.

#IngenieríaDeDatos #GDELT #Arquitectura #TiempoReal

> Publicado en: https://www.linkedin.com/posts/carlos-capote-perez-andreu_ingenieraedadedatos-gdelt-arquitectura-activity-7452347963357540352-kcfJ