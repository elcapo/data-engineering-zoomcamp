En el primer artículo enumeré las preguntas que me interesaba responder con GDELT: dónde se concentran los eventos, qué actores son los más activos, cómo se propagan las noticias, cuál es el tono de las coberturas. No había todavía ni una línea de código. Unas cuántas horas de trabajo después, el proyecto tiene un panel de datos.

La captura (ver imagen adjunta) es solo el broche final. Todo lo que sostiene esos gráficos ya se contó: el panel vive en Metabase, se reinstala desde Git con un comando, lee tablas agregadas que Flink reescribe cada 15 minutos y se levanta junto con los otros nueve contenedores en cualquier máquina que clone el repositorio.

Lo que sí merece mirarse es cómo cada bloque del panel responde una de las preguntas iniciales:

- **Mapa global de eventos**. Cada país coloreado por número de eventos en la ventana. Resuelve "¿dónde se concentra la actividad ahora mismo?" de un vistazo.

- **Top actores y atención mediática**. A la izquierda, qué actores aparecen más veces en los eventos; a la derecha, cuáles acumulan más menciones. Dos ángulos de la misma pregunta, "¿quién es el más activo?", separando lo que ocurre de lo que se cuenta.

- **Análisis de tono por organización y por persona**. Las puntuaciones de tono del GKG agregadas por entidad. La pregunta sobre la tonalidad de las coberturas, partida en dos porque "quién" tiene dos escalas distintas.

- **Volumen de eventos y tendencia de conflicto**. Series temporales con el recuento por tipo y la escala Goldstein media por país. La pregunta "¿aumenta o disminuye?" queda resuelta, literalmente, como la pendiente de una línea.

Cada uno de esos gráficos es una consulta sobre una tabla agregada y cada tabla agregada existe gracias a una decisión concreta tomada en algún artículo anterior: claves primarias para hacer los flujos idempotentes, ventanas ancladas al tiempo de proceso, esquemas recortados a los campos que realmente importan y ramas paralelas que preservan los datos en bruto por si mañana hace falta rehacer algún cálculo.

Si hay una conclusión tras todo este trabajo es que la parte vistosa de un proyecto de datos —el panel bonito— ocupa un porcentaje diminuto del trabajo. Lo demás es decidir cómo arranca el sistema, cómo se recupera de un fallo, cómo se reparten las contraseñas, qué se guarda en bruto y qué se agrega, a qué reloj se ata cada ventana. Cosas que no se ven pero que son la diferencia entre un panel que funciona hoy en mi portátil y un proyecto que cualquiera puede clonar, levantar y mirar.

#IngenieríaDeDatos #GDELT #Cierre

![Panel final del proyecto](../resources/images/dashboard/dashboard.png)