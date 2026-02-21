# Plataformas de datos

## Buenas prácticas programando con IA

En la última sesión del Zoomcamp _vibe codeamos_ un flujo de datos con inteligencia artificial (IA). La experiencia es potente: en cuestión de segundos puedes generar más código del que escribirías manualmente en horas. Pero eso plantea una pregunta incómoda y muy relevante desde el punto de vista de ingeniería.

Si la IA produce código diez veces más rápido... ¿cómo sabemos que ese código es realmente correcto? Y no "correcto" en el sentido de que compila o ejecuta sin errores sino correcto en lo que importa. Que respeta la lógica de negocio, que encaja en nuestro sistema y que no rompe nada que antes funcionaba.

Para responder a esta pregunta, esta sesión la he basado en el vídeo [How to Make the Best of AI Programming Assistants](https://www.youtube.com/live/XavrebMKH2A) del canal **Modern Software Engineering**, que propone que la clave no viene del mundo de la IA, sino de una idea clásica de la teoría de la información: el teorema de muestreo de Nyquist-Shannon.

### Teorema de muestreo de Nyquist-Shannon

El teorema de muestreo Nyquist-Shannon dice que, para capturar correctamente una señal, hay que muestrearla al menos al doble de su frecuencia más alta. Traducido a desarrollo de software: si aumentas la frecuencia a la que produces cambios, tienes que aumentar la frecuencia a la que los validas.

Cuando escribimos código a mano, la retroalimentación es casi continua: probamos pequeñas partes, ejecutamos tests, revisamos el comportamiento poco a poco. Con la IA ocurre lo contrario: pasamos de generar una función a generar un módulo entero en segundos.

La frecuencia de cambio se dispara, pero nuestros mecanismos de validación suelen seguir siendo los mismos:

* revisión manual,
* pruebas ocasionales y
* ejecución de pipelines al final.

El problema no es la IA, es nuestra velocidad al evaluar los cambios.

### Validar funcionalidad frente a validar sintaxis

El código que genera un asistente suele:

* ser sintácticamente correcto,
* tener buena pinta y
* seguir patrones conocidos.

Eso hace que sea especialmente difícil detectar errores sutiles leyendo el código. No puedes revisar manualmente miles de líneas cada vez que el agente genera código. Y aunque lo hicieras, seguirías validando a baja frecuencia. Ahí es donde aparece la disciplina que ya conocíamos de otros contextos: integración continua.

### Integración contínua como mecanismo de _muestreo_

La integración continua no es solo un flujo que ejecuta tests. Es el sistema que nos permite validar el estado real del software cada vez que cambia. Si la IA genera código constantemente, necesitamos:

* ejecutar los tests en cada cambio,
* validar automáticamente arquitectura, tipos, contratos y
* comprobar comportamiento, no solo sintaxis.

En ese sentido, la integración continua se convierte en nuestro mecanismo de muestreo: el único modo fiable de saber si el sistema sigue siendo correcto.

### ¿Qué implicaciones tiene esto al programar con IA?

Trabajar con IA de forma responsable no consiste en revisar más código, sino en cambiar el flujo de trabajo:

#### 1. Pedir cambios pequeños

* No tiene sentido generar una funcionalidad entera y validarla al final.
* Es mejor trabajar en iteraciones cortas y obtener retroalimentación continua.

#### 2. Tener pipelines rápidos

* Si tu validación tarda 30 minutos, ya vas demasiado lento para el ritmo de la IA.
* La retroalimentación tiene que llegar en segundos.

#### 3. Hacer que los tests sean la fuente de verdad

* La revisión manual deja de ser el mecanismo principal.
* Lo que determina si el código es correcto es el comportamiento verificado automáticamente.

#### 4. Integrar con mucha frecuencia

* Crear muchas ramas reduce la frecuencia de validación y aumentan el riesgo.
* Las ramas se ocultan funcionalidades entre ellas, dificultando la integración contínua.

#### 5. Llegar a producción cuanto antes

* El sistema en producción es la fuente principal de retroalimentación.
* Todo lo demás son aproximaciones.

### ¿Qué ha cambiado?

Antes, el cuello de botella era la velocidad a la que un desarrollador podía escribir código. Ahora ese límite ha desaparecido. Eso es una ventaja enorme, pero cambia la dinámica fundamental del desarrollo:

> La retroalimentación pasa a ser una preocupación de primer nivel.

No es una buena práctica opcional, es un requisito estructural.

### Consejos para la programación con IA

#### 1. Trabaja en pasos pequeños.

* Evita trabajar en oleadas grandes que agrupen muchos cambios a la vez.
* Busca la retroalimentación tan pronto como sea posible.
* Evalúa tras cada cambio.

#### 2. Optimiza para retroalimentaciones rápidas.

* Impón un ritmo de observación más rápido que el ritmo de cambios en el código.
* Asegúrate de que tus evaluaciones sean rápidas y precisas.

#### 3. Establece tus tests como tu fuente de verdad.

* Haz que sean los tests y no pruebas manuales las que deciden si despliegas.

#### 4. Evita crear ramas para cada funcionalidad.

* Evita ocultar funcionalidades en ramas.
* Integra con frecuencia.

#### 5. Invierte en un flujo de integración.

* Hazlo rápido, fiable y reproducible.
* Llévalo desde desarrollo hasta producción.

### Aplicación a proyectos de datos

En el contexto de ingeniería de datos esto encaja de forma natural con cosas que ya venimos trabajando:

* tests en **dbt**,
* ejecución reproducible de flujos de datos,
* validaciones automáticas,
* despliegues frecuentes y
* entornos consistentes.

Usar IA para generar modelos, transformaciones o flujos completos tiene sentido solo si el sistema que los valida está preparado para ese ritmo. Si no, estamos generando complejidad más rápido de lo que podemos entenderla.

### Conclusión

No se trata de usar menos IA sino de aumentar la frecuencia de las evaluaciones. Si la generación de código se acelera y la validación no, vamos a aceptar como correctos sistemas que en realidad están rotos.

Y la solución no es nueva ni específica de la IA. Es la misma disciplina que llevamos años aprendiendo con integración continua y entrega continua. Solo que ahora es imprescindible.
