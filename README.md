# Zoomcamp de ingeniería de datos

Este repositorio contiene las notas que yo, [Carlos Capote](https://www.linkedin.com/in/carlos-capote-perez-andreu/), sin afiliación ninguna con los organizadores oficiales, he tomado en castellano durante la edición de 2026 del [Data Engineering Zoomcamp](https://datatalks.club/blog/data-engineering-zoomcamp.html) de [DataTalks.Club](https://datatalks.club).

## Sobre estas notas

**Qué no son**

* No son notas oficiales.
* No son una traducción al pie de la letra.

**Qué son**

* Son simplemente mis notas del curso.
* Son notas que he escrito de cada capítulo tras finalizarlo, a modo de repaso.
* Son un intento mío de hacer accesibles los contenidos del curso a personas de habla hispana.

## Contexto

En 2025 participé en otro curso de los mismos organizadores, en particular, el [Machine Learning Zoomcamp](https://datatalks.club/blog/machine-learning-zoomcamp.html) pero en ese caso apenas tomé [notas](https://github.com/elcapo/ml-zoomcamp-notes-and-homework) y no produje vídeos, pese a que tenía ganas de hacerlo desde el primer día.

En este caso, mi intención es crear una versión en castellano de los contenidos que contenga toda la teoría necesaria para seguir el curso, al menos tal y como está siendo impartido en 2026. Si estás pensando usar este repositorio para seguir el curso, ten en cuenta que si quieres el certificado, las entregas tendrás que hacerlas en inglés.

## Objetivos del curso

El **Data Engineering Zoomcamp** es un curso práctico de 9 semanas que te enseña a implementar flujos de datos usando herramientas como:

* [Docker](https://www.docker.com/)  
  Plataforma de contenedores que permite empaquetar aplicaciones y sus dependencias para que se ejecuten de forma reproducible en cualquier entorno.

* [Terraform](https://developer.hashicorp.com/terraform)  
  Herramienta de *infraestructura como código* que permite definir, crear y versionar infraestructuras en la nube mediante archivos declarativos.

* [BigQuery](https://cloud.google.com/bigquery)  
  Almacén de datos analítico totalmente gestionado que permite consultar grandes volúmenes de datos mediante SQL de forma rápida y escalable.

* [dbt](https://www.getdbt.com/)  
  Framework para transformar y modelar datos dentro del *almacén de datos*, aplicando buenas prácticas de ingeniería de software como tests y versionado.

* [Spark](https://spark.apache.org/)  
  Motor de procesamiento distribuido diseñado para trabajar con grandes conjuntos de datos de forma eficiente, tanto en batch como en streaming.

* [Kafka](https://kafka.apache.org/)  
  Plataforma de mensajería distribuida orientada a eventos, utilizada para construir pipelines de datos en tiempo real y arquitecturas desacopladas.

El curso, que es gratuito, termina con un proyecto "real" que te da derecho a obtener un certificado.

## Recursos

Entre los recursos más importantes que debes de conocer para seguir el curso, están:

* [Página web del curso](https://datatalks.club/blog/data-engineering-zoomcamp.html)
  Introducción al curso, algo parecido a este mismo documento pero oficial y en inglés.

* [Comunidad en Slack](https://datatalks-club.slack.com/)
  Uno de los puntos fuertes del curso es su comunidad, que se organiza en torno a Slack. En el sitio web de **DataTalks.Club** hay una página dedicada a explicarte [cómo unirte a su Slack](https://datatalks.club/slack.html). Una vez te unas, no te olvides de seguir el canal **#course-data-engineering**.

* [Repositorio en GitHub](https://github.com/DataTalksClub/data-engineering-zoomcamp)
  Diapositivas, notas de cada una de las sesiones, ejercicios y otros enlaces útiles.

* [Lista de vídeos de Youtube Oficial](https://www.youtube.com/playlist?list=PL3MmuxUbc_hJed7dXYoJw8DoCuVHhGEQb)
  El tutor, normalmente Alexey Grigorev, ofrece explicaciones detalladas de cada una de las sesiones. Estos son los vídeos oficiales, en inglés.

* [Canal de Telegram](https://t.me/dezoomcamp)
  Canal de Telegram específico para hacer anuncios sobre el curso.

* [Preguntas frecuentes](https://datatalks.club/faq/data-engineering-zoomcamp.html)
  Página colaborativa dedicada a compartir información sobre preguntas frecuentes relacionadas con el curso.

## Prerrequisitos

Aunque el curso cubre muchas tecnologías, está pensado para que sea accesible a personas que se están iniciando en la ingeniería de datos. Los únicos requisitos son:

* Comodidad al usar la línea de comandos.
* Conocimientos básicos de SQL.

Además, se recomienda (aunque no se considera requisito):

* Familiaridad con Python.

## Contenidos

El curso organiza sus contenidos en 6 módulos y un proyecto final:

1. **Infraestructura y prerrequisitos**
  * Configurar el entorno de desarrollo con **Docker** y **PostgreSQL**
  * Aprender los fundamentos de la nube con **Google Cloud Platform (GCP)**
  * Usar **Terraform** para gestionar infraestructura como código

2. **Orquestación de flujos de trabajo**
  * Dominar la orquestación de pipelines de datos con **Kestra**
  * Implementar y gestionar *Data Lakes* en **Google Cloud Storage**
  * Construir flujos de trabajo automatizados y reproducibles

3. **Almacén de datos (Data Warehouse)**
  * Profundizar en **BigQuery** para almacenamiento de datos empresarial
  * Aprender técnicas de optimización como particionado y *clustering*
  * Aplicar buenas prácticas para almacenamiento y consulta de datos

4. **Ingeniería analítica**
  * Transformar datos crudos en modelos preparados para análisis con **dbt**
  * Desarrollar estrategias de pruebas y documentación
  * Crear visualizaciones significativas con herramientas modernas de BI

5. **Procesamiento por lotes (Batch)**
  * Procesar grandes volúmenes de datos con **Apache Spark**
  * Dominar Spark SQL y operaciones con *DataFrames*
  * Optimizar workflows de procesamiento por lotes

6. **Procesamiento en tiempo real (Streaming)**
  * Construir pipelines de datos en tiempo real con **Kafka**
  * Desarrollar aplicaciones de streaming con **KSQL**
  * Manejar esquemas de datos con **Avro**

7. **Proyecto final (Capstone)**
  * Construir una canalización *end-to-end* desde la ingesta hasta la visualización
  * Aplicar todos los conceptos aprendidos en un proyecto real
  * Documentar y presentar un proyecto listo para portafolio profesional

Puedes encontrar versiones oficiales (en inglés) de las tablas de contenidos del curso en la [página del curso](https://datatalks.club/blog/data-engineering-zoomcamp.html#course-curriculum-what-youll-learn-in-the-data-engineering-zoomcamp) y en el fichero "léeme" del [repositorio de GitHub](https://github.com/DataTalksClub/data-engineering-zoomcamp?tab=readme-ov-file#modules).
