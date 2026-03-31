Como no podía ser de otra manera, teniendo en cuenta que es mi primer intento de proyecto final para el Zoomcamp de ingeniería de datos, este proyecto lo he construido solo; con ayuda de la Inteligencia Artificial (Claude Code), eso sí. Y todo en menos de dos semanas.

El relato habitual de la IA y el código suele simplificarse en dos extremos: o es magia que lo escribe todo, o es un autocompletado glorificado. Mi experiencia no encaja en ninguno de los dos. Lo más parecido es tener a un compañero de equipo muy rápido y con buena memoria, al que tienes que dirigir con criterio.

Dirigir, no delegar. Cuando le pido que escriba un parser para un formato nuevo del BOC, no le digo "escríbeme un parser". Le doy contexto: cómo funcionan los parsers existentes, qué patrón siguen, qué fixtures uso para testear, qué normalización aplico a las secciones. El resultado no es código genérico: es código que encaja en la arquitectura del proyecto.

Para mí, donde más valor me aporta no es en escribir código nuevo sino en las tareas que un desarrollador solo tiende a postergar. Tests, por ejemplo. Tengo treinta ficheros de test entre Python y TypeScript. Muchos de esos tests los he generado con Claude Code a partir de los fixtures reales del BOC, los mismos HTML y PDF que el sistema procesa en producción. Yo defino qué debe verificar cada test, qué caso cubre, qué invariante protege. La herramienta genera la implementación.

Las refactorizaciones son otro caso. Cuando necesité cambiar cómo se construyen las consultas de búsqueda en el frontend, Claude Code tenía contexto del repositorio completo: el patrón repositorio, las consultas de Prisma, los tipos de TypeScript y los tests unitarios y de integración existentes. Pude iterar sobre la refactorización en minutos, verificando en cada paso que los tests seguían pasando. Un desarrollador solo, sin esta herramienta, habría tardado días, o habría dejado la refactorización para más adelante.

También me ha cambiado la forma de explorar decisiones de diseño. Antes de implementar, pregunto. ¿Pongo la normalización de secciones en el parser, o en la carga? ¿Uso una vista materializada, o una tabla para las métricas de cobertura? No acepto la primera respuesta: planteo objeciones, pido que considere las implicaciones sobre el código existente, comparo con lo que ya tengo.

Al final no solo tengo más código, sino código más fiable y más fácil de modificar. Los tests documentan el comportamiento esperado. Las refactorizaciones continuas mantienen la deuda técnica baja. La documentación se escribe cuando el contexto está fresco, no semanas después. Un desarrollador solo con estas herramientas no produce lo mismo que un equipo pero produce bastante más de lo que produciría solo. Y con una calidad sostenible.

#DataEngineering #AprendeEnPúblico #DataTalksClub #ClaudeCode #IA #DatosAbiertos #IslasCanarias
