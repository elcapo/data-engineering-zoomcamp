---
title: Metodología y Fuentes
description: Cómo se obtienen, procesan y almacenan los datos del Boletín Oficial de Canarias.
---

## Fuente de Datos

Los datos provienen del **Boletín Oficial de Canarias (BOC)**, publicación oficial del Gobierno de Canarias disponible en [www.gobiernodecanarias.org/boc](https://www.gobiernodecanarias.org/boc).

La autoría de todos los textos publicados corresponde al Gobierno de Canarias y a los organismos emisores de cada disposición. Este proyecto los reproduce citando la fuente conforme a las condiciones de reproducción establecidas.

## Proceso de Obtención

La plataforma obtiene los datos mediante un proceso automatizado que:

1. **Descarga** los índices del BOC (archivo histórico, años, boletines y disposiciones individuales) desde la web oficial en formato HTML.
2. **Extrae** los metadatos y el texto completo de cada disposición, preservando la estructura original.
3. **Almacena** los textos en una base de datos con índices de búsqueda de texto completo en español.

El proceso respeta los tiempos de respuesta del servidor oficial y no genera carga significativa sobre la infraestructura del Gobierno de Canarias.

## Cobertura Histórica

El BOC publica en su web el archivo completo desde **1980** hasta la actualidad. Esta plataforma aspira a indexar la totalidad del archivo histórico disponible.

La página de [métricas](/metricas) muestra en tiempo real el porcentaje del corpus histórico que está actualmente disponible en la base de datos, desglosado por año y boletín.

## Limitaciones Conocidas

- Los boletines más antiguos (anteriores a cierto año) pueden presentar una estructura HTML diferente que limita la extracción del texto completo.
- Las imágenes, tablas complejas y anexos en formato PDF no son actualmente indexados.
- El proceso de actualización no es en tiempo real. Puede haber un desfase de horas o días respecto a la publicación oficial.

## Tecnología

- **Base de datos:** PostgreSQL con búsqueda de texto completo (`tsvector`) en configuración lingüística española.
- **Código fuente:** disponible en [repositorio por definir] bajo licencia de código abierto.

## Contacto

Para reportar errores en los datos o en la extracción, o para sugerencias: [formulario / email por definir].
