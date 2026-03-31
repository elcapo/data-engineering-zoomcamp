En ingeniería de datos no hablamos lo suficiente sobre tests. Los tutoriales se centran en montar flujos de datos, no en verificar que funcionan. Y sin embargo, los tests son lo que te permite dormir tranquilo.

Mi proyecto del Boletín Oficial de Canarias tiene unos treinta ficheros de test repartidos entre el flujo de datos (Python, con pytest) y el frontend (TypeScript, con Vitest). Cada parte se testea con un enfoque diferente porque los problemas que resuelven son diferentes.

En el flujo de datos, el reto es que los datos de entrada son impredecibles. El HTML del BOC de 1982 no se parece al de 2009 ni al actual. La única forma fiable de saber que un parser funciona es probarlo contra HTML real. Por eso los tests del flujo de datos usan como fixtures páginas descargadas directamente del sitio web del BOC y PDFs reales de boletines históricos. No son datos inventados: son los mismos documentos que el sistema procesa en producción.

Si el parser del formato 1982 extrae once disposiciones de un boletín concreto, el test verifica que sigue extrayendo exactamente once, con las secciones, organismos y enlaces correctos. Lo mismo con los PDF: el test comprueba que de un boletín de 2001 se extraen cincuenta y cinco disposiciones, que no hay palabras rotas por guiones y que los resúmenes no contienen elementos de las cabeceras o pies de página de la web.

En el frontend, los tests unitarios verifican componentes y lógica de negocio con mocks del repositorio de datos. ¿El paginador desactiva el botón cuando no hay página siguiente? ¿El constructor de búsquedas traduce correctamente "convocatoria beca" a la expresión de búsqueda de PostgreSQL? ¿Los filtros por fecha, sección y organismo se serializan bien en la URL? Son tests rápidos que se ejecutan sin base de datos.

Pero también hay tests de integración que sí conectan con PostgreSQL real. Estos verifican que las consultas del repositorio devuelven resultados coherentes: que la paginación no produce duplicados, que los porcentajes de cobertura están entre cero y cien, que los conteos de secciones cuadran con el total de disposiciones. Son los tests que atrapan los errores que un mock nunca encontraría.

La mejor decisión fue usar datos reales como fixtures en lugar de fabricar ejemplos simplificados. Un HTML inventado solo verifica lo que imaginaste que podía salir mal. Un HTML real del BOC de 1993 verifica lo que realmente sale mal, incluyendo los casos que nunca habrías anticipado. Cada vez que un parser falla con un formato nuevo, el documento que causó el error se convierte en un fixture más. La suite crece con el proyecto y cada test es un contrato: esto funcionó así una vez y debe seguir funcionando así siempre.

#DataEngineering #AprendeEnPúblico #DataTalksClub #Testing #Python #Vitest #DatosAbiertos
