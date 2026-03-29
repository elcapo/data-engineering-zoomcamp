---
title: Metodología y Fuentes
description: Cómo se obtienen, procesan y presentan los datos del Boletín Oficial de Canarias en esta plataforma.
---

## De dónde vienen los datos

Toda la información que encuentras en esta web procede del **Boletín Oficial de Canarias (BOC)**, la publicación oficial del Gobierno de Canarias. Puedes consultarlo directamente en [www.gobiernodecanarias.org/boc](https://www.gobiernodecanarias.org/boc).

La autoría de todos los textos corresponde al Gobierno de Canarias y a los organismos emisores de cada disposición. Nosotros los reproducimos citando la fuente, conforme a las condiciones de reproducción establecidas por el propio Gobierno.

## Cómo funciona el proceso

La plataforma obtiene y procesa los datos del BOC de forma automatizada, en tres pasos:

1. **Descarga de índices.** Se recorren los índices del archivo histórico del BOC (años, boletines y disposiciones individuales) desde la web oficial.
2. **Extracción de contenido.** De cada disposición se extraen los metadatos (fecha, sección, organismo, título) y el texto completo, preservando la estructura original del documento.
3. **Almacenamiento e indexación.** Los textos se guardan en una base de datos PostgreSQL con índices de búsqueda de texto completo configurados para el idioma español, lo que te permite buscar con precisión dentro del contenido de las disposiciones.

El proceso está diseñado para respetar los tiempos de respuesta del servidor oficial y no generar una carga significativa sobre su infraestructura.

## Cobertura histórica

El archivo digital del BOC abarca desde **1980** hasta la actualidad. Esta plataforma aspira a indexar la totalidad de ese corpus histórico.

En la página de [métricas](/metricas) puedes consultar en tiempo real qué porcentaje del archivo está disponible en nuestra base de datos, desglosado por año y por boletín. Así puedes saber exactamente qué períodos están completos y cuáles están aún en proceso.

## Limitaciones que debes conocer

- **Boletines antiguos.** Los números más antiguos del BOC pueden tener una estructura HTML diferente que dificulta la extracción automática del texto completo. En estos casos, es posible que solo dispongas de los metadatos básicos.
- **Contenido no textual.** Las imágenes, tablas complejas y anexos en formato PDF no se indexan actualmente. Si la disposición que buscas incluye este tipo de contenido, te recomendamos consultar el documento original en la web del BOC.
- **Desfase temporal.** La actualización no es en tiempo real. Puede haber un desfase de horas o días entre la publicación oficial de un boletín y su disponibilidad en esta plataforma.

## Tecnología

- **Base de datos:** PostgreSQL con búsqueda de texto completo (`tsvector`) en configuración lingüística española.
- **Pipeline de datos:** orquestado con Kestra, con flujos de descarga y extracción independientes.
- **Frontend:** Next.js con renderizado en servidor.
- **Código fuente:** disponible de forma abierta para su consulta y reutilización.

## Contacto

Si detectas algún error en los datos, crees que falta algún boletín o tienes sugerencias para mejorar el proceso, escríbenos a **[pendiente de definir]**.
