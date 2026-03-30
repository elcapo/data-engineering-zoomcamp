# Análisis del Boletín Oficial de Canarias (BOC)

Proyecto de análisis de datos del Boletín Oficial de Canarias utilizando Kestra para la orquestación de flujos de trabajo, DLT para la carga de datos en una base de datos relacional estructurada y una web desarrollada en Next.js para la visualización de datos.

## Contexto

Este proyecto ha sido presentado como proyecto final de curso del Zoomcamp de ingeniería de datos de DataTalks en 2026. Los proyectos deben mostrar que se comprenden las herramientas vistas a lo largo del curso y que se dispone de las habilidades necesarias para usarlas en contextos reales.

> [!NOTE]
> Para más información, consultar las guías de proyectos de DataTalksClub.
> * [DataTalksClub Zoomcamp Project Guidelines](https://www.loom.com/share/8f99d25893de4fb8aaa95c0395c740b6)
> * [Data Engineering Zoomcamp Project Statement](https://github.com/DataTalksClub/data-engineering-zoomcamp/tree/main/projects)

## Objetivos

El Boletín Oficial de Canarias publica en archivos (PDF y HTML) sin ofrecer ningún tipo de índice de contenidos, más allá del índice individual de contenidos de cada uno de los boletines. Con este proyecto queremos realizar un índice que facilite búsquedas avanzadas a través del uso de índices generados expresamente para esto.

### Ingesta

Como proyecto nos proponemos implementar un flujo de datos cuya ingestión de datos consiste en la descarga sin procesar de cada uno de los boletines en un cierto rango de fechas. Aunque el objetivo no será necesariamente cubrir todos los artículos publicados desde los inicios del boletín en 1980, el proyecto se organizará de forma que se puedan realizar rellenos históricos de forma sencilla.

> [!NOTE]
> Hay una página con documentación específica sobre las [fuentes de datos](pipeline/docs/fuentes-de-datos/README.md) que incluye un detalle sobre cómo se ha implementado cada uno de los flujos de ingestión.

### Transformación

En cuanto a las transformaciones de datos, las dividiremos en dos estapas:

* Primero, una limpieza de los datos descargados para dejar únicamente texto legible (eliminando menús, barras laterales, cabeceras y pies de página).
* Luego, un análisis de los textos para analizar, extraer y estructurar la información más relevante de cada artículo.

### Consumo

Para facilitar el consumo de la información procesada, se crearán paneles de control.

## Visión esquemática

| Tarea | Herramienta |
| --- | --- |
| Descarga y extracción de artículos del BOC | Kestra |
| Lago de datos y versionado de documentos | MiniIO |
| Almacenamiento estructurado | DLT |
| Visualización y consulta de datos | Next.js |
