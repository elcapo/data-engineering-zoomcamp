Cuando descargas más de 200.000 documentos de forma incremental durante semanas, necesitas saber en todo momento qué tienes y qué te falta. Por eso una de las primeras páginas que construí en el frontend fue la de Cobertura.

La idea es simple: cruzar lo que debería existir (según el nivel superior de la jerarquía) con lo que realmente se ha descargado y extraído. Si el índice del año 2024 lista 250 boletines, ¿cuántos tengo? Y de esos boletines, ¿cuántas disposiciones he descargado? ¿Cuántas he extraído? La respuesta a cada pregunta es una vista SQL que une las tablas de datos con las tablas de log que mencioné en el artículo anterior sobre DLT.

Son seis vistas en total, dos por nivel (descarga y extracción): años, boletines y disposiciones. Cada una calcula un porcentaje de cobertura. Estas vistas ya existían en el pipeline para alimentar los seguimientos automáticos de Kestra, así que reutilizarlas en el frontend fue inmediato.

La página muestra la cobertura en tres niveles jerárquicos que el usuario puede expandir progresivamente. Arriba, tres tarjetas KPI con los porcentajes globales: años descargados, boletines descargados y texto completo extraído. Son los tres números que resumen el estado del proyecto de un vistazo.

Debajo, tablas expandibles. Al hacer clic en un año se despliegan sus boletines con barras de progreso coloreadas: verde por encima del 95%, azul entre el 50% y el 95%, naranja por debajo. Al hacer clic en un boletín aparecen sus disposiciones individuales con las fechas de descarga y extracción.

Los detalles se cargan bajo demanda. La página inicial solo trae los datos agregados. Cuando el usuario expande un año, una llamada a la API trae los boletines de ese año. Cuando expande un boletín, otra llamada trae las disposiciones paginadas. Así la carga inicial es rápida y la página escala sin problema aunque el volumen de datos crezca.

Más allá de su utilidad como herramienta de monitorización durante el desarrollo, la página de Cobertura cumple otro objetivo: transparencia. Cualquier visitante puede ver exactamente qué porcentaje del archivo histórico está disponible y dónde hay huecos. En un proyecto de datos abiertos, mostrar con honestidad el estado de los datos me parece tan importante como los datos en sí.

#DataEngineering #AprendeEnPúblico #DataTalksClub #NextJS #PostgreSQL #DataQuality #DatosAbiertos
