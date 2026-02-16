# Zoomcamp de ingeniería de datos

Este repositorio recopila notas en castellano del [Data Engineering Zoomcamp](https://datatalks.club/blog/data-engineering-zoomcamp.html) de [DataTalks.Club](https://datatalks.club) (edición 2026), elaboradas de forma independiente a partir de mi seguimiento del curso. No es material oficial ni una traducción literal: son apuntes propios, escritos como síntesis y repaso tras completar cada bloque.

> [!NOTE]
> El objetivo es **hacer más accesibles los contenidos del curso a personas hispanohablantes**, concentrando la teoría necesaria para seguirlo con soltura y entender las decisiones técnicas que se van tomando a lo largo del programa. La intención es que este repositorio acabe siendo una **versión coherente y completa de los contenidos teóricos** del curso, tal y como se imparten en 2026, sin depender de haber visto previamente los vídeos.

Estas notas están pensadas como **acompañamiento al curso original**: pueden servirte para estudiar, repasar conceptos o tener una referencia en español, pero el curso, los ejercicios y la certificación oficial siguen siendo en inglés.

## Qué es la ingeniería de datos

La necesidad de hacer ingeniería de datos surge en una organización **cuando los datos empiezan a estar dispersos** en muchas herramientas, se duplican, se contradicen o requieren demasiado esfuerzo manual para usarse.

Por ejemplo, cuando **los informes tardan días en prepararse**, cada equipo maneja cifras distintas o un cambio pequeño rompe varios procesos, es señal de que faltan bases sólidas.

En ese punto, la **ingeniería de datos permite ordenar los flujos**, automatizar tareas y asegurar que la información llegue a las personas adecuadas, en el momento adecuado y con la calidad necesaria.

## Recursos

Entre los recursos más importantes que debes de conocer para seguir el curso, están:

* [Presentación del curso](https://datatalks.club/blog/data-engineering-zoomcamp.html)  
  Introducción al curso, algo parecido a este mismo documento pero oficial y en inglés.

* [Página de entregas y calificaciones](https://courses.datatalks.club/de-zoomcamp-2026/)  
  Lista las fechas límite de cada entrega e incluye enlaces para hacer los envíos tanto de cada ejercicio entregable como de los proyectos. Una vez corregidos, también puedes ver aquí tus calificaciones.

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

El curso organiza sus contenidos en 6 módulos y un proyecto final.

### 1. **[Infraestructura y prerrequisitos](01-infraestructura-y-prerrequisitos/README.md)**

  * Configurar el entorno de desarrollo con **Docker** y **PostgreSQL**
  * Aprender los fundamentos de la nube con **Google Cloud Platform (GCP)**
  * Usar **Terraform** para gestionar infraestructura como código

### 2. **[Orquestación de flujos de datos](02-orquestacion-de-flujos-de-datos/README.md)**

  * Dominar la orquestación de flujos de datos con **Kestra**
  * Transformar un script ETL en un flujo de datos observable
  * Construir flujos de datos automatizados y reproducibles

### 3. **[Almacenes de datos](03-almacenes-de-datos/README.md)**

  * Profundizar en **BigQuery** para almacenamiento de datos empresarial
  * Aprender técnicas de optimización como particionado y *clustering*
  * Aplicar buenas prácticas para almacenamiento y consulta de datos

### 4. **[Análisis de datos](04-analisis-de-datos/README.md)**

  * Transformar datos crudos en modelos preparados para análisis con **dbt**
  * Desarrollar estrategias de pruebas y documentación
  * Crear visualizaciones significativas con herramientas modernas de BI

### 5. **[Plataformas de datos](05-plataformas-de-datos/README.md)**

  * Construir flujos de datos de principio a fin con **Bruin**
  * Implementar la ingestión, transformaciones y comprobaciones de calidad de datos
  * Desplegar en la nube con **BigQuery**

### 6. **Procesamiento por lotes (Batch)**

  * Procesar grandes volúmenes de datos con **Apache Spark**
  * Dominar Spark SQL y operaciones con *DataFrames*
  * Optimizar workflows de procesamiento por lotes

### 7. **Procesamiento en tiempo real (Streaming)**
  * Construir pipelines de datos en tiempo real con **Kafka**
  * Desarrollar aplicaciones de streaming con **KSQL**
  * Manejar esquemas de datos con **Avro**

### 8. **Proyecto final (Capstone)**

  * Construir una canalización *end-to-end* desde la ingesta hasta la visualización
  * Aplicar todos los conceptos aprendidos en un proyecto real
  * Documentar y presentar un proyecto listo para portafolio profesional

Puedes encontrar versiones oficiales (en inglés) de las tablas de contenidos del curso en la [página del curso](https://datatalks.club/blog/data-engineering-zoomcamp.html#course-curriculum-what-youll-learn-in-the-data-engineering-zoomcamp) y en el fichero "léeme" del [repositorio de GitHub](https://github.com/DataTalksClub/data-engineering-zoomcamp?tab=readme-ov-file#modules).

## Tecnologías utilizadas

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

## Formas de seguir el curso

Puedes seguir el curso de dos maneras diferentes:

* **Siguiendo en vivo una cohorte**  
  * Se sigue una agenda fija de 9 semanas (de enero a marzo)
  * La agenda impone entregas con fechas límite
  * Recibirás evaluaciones de tus ejercicios y de tu proyecto final
  * Recibirás un certificado al finalizar

* **A tu propio ritmo**  
  * Empiezas y terminas cuando quieras
  * El ritmo de estudio lo pones tú
  * No recibirás evaluaciones de tus ejercicios ni de tu proyecto
  * No podrás acceder a un certificado

En cualquiera de los casos:

* Los materiales son totalmente accesibles de forma gratuita en Youtube y Github.
* Puedes pedir apoyo a la comunidad a través del canal de Slack.

Recuerda que los enlaces están en la sección de recursos.

## Ejercicios para entregar

Si optas por seguir el curso con una cohorte, recuerda que debes inscribirte. Este es el [enlace para la inscripción](https://airtable.com/appzbS8Pkg9PL254a/shr6oVXeQvSI5HuWD) en la cohorte de 2026. Ten en cuenta que hay fechas prestablecidas para las entregas, siendo la primera el próximo lunes 26.

| **Entregable** | **Fecha límite** |
| --- | --- |
| Módulo 1: **[Docker, SQL y Terraform](01-infraestructura-y-prerrequisitos/homework/README.md)** | 26 de enero de 2026 |
| Módulo 2: **[Orquestación de flujos de datos](02-orquestacion-de-flujos-de-datos/homework/README.md)** | 2 de febrero de 2026 |
| Módulo 3: **[Almacenes de datos](03-almacenes-de-datos/homework/README.md)** | 9 de febrero de 2026 |
| Módulo 4: **[Analísis de datos](04-analisis-de-datos/homework/README.md)** | 16 de febrero de 2026
| Módulo 5: **Plataformas de datos** | 28 de febrero de 2026 |
| Taller 1: **Ingesta de datos** | 2 de marzo de 2026 |
| Módulo 6: **Procesos por lotes** | 9 de marzo de 2026 |
| Módulo 7: **Procesos en streaming** | 16 de marzo de 2026 |

## Proyecto final

En cuanto al proyecto, dispones de dos intentos con fechas límite diferentes.

| **Entregable** | **Fecha límite** |
| --- | --- |
| Proyecto: **Primer intento** | 31 de marzo de 2026 |
| Proyecto: **Segundo intento** | 21 de abril de 2026 |

## Aprendizaje en público

Cuando vayas a hacer tu primera entrega, verás que además de los ejercicios a resolver, te pedirán también enlaces en los que hayas compartido información sobre tu proceso de aprendizaje. Cada uno de esos enlaces añade puntos a tu calificación final, ayudándote a mejorar tu posición en el "tablón de líderes".