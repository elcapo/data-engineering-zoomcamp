A estas alturas, no es ningún secreto que estoy participando en el Data Engineering Zoomcamp de DataTalksClub, un curso gratuito y abierto que cubre los fundamentos de la ingeniería de datos moderna: orquestación de pipelines, lagos y almacenes de datos, y procesos por lotes y en tiempo real. Como proyecto final, cada alumno desarrolla un caso real de principio a fin. Te cuento de qué va el mío.

El Boletín Oficial de Canarias (BOC) publica miles de disposiciones cada año: convocatorias, normativa, subvenciones, resoluciones... Documentos que afectan directamente a ciudadanos, empresas, abogados y periodistas. El problema es que la web oficial del BOC no ofrece un índice completo ni búsqueda avanzada sobre el texto de las disposiciones. Si necesitas encontrar un documento concreto entre los más de cien mil publicados desde 1980, la experiencia es lenta y limitada.

Cualquier análisis de datos es inviable.

Mi proyecto construye una plataforma que descarga, indexa y hace accesible todo el archivo histórico del BOC. El objetivo es sencillo: que cualquier persona pueda buscar en el texto completo de cualquier disposición publicada en las últimas cuatro décadas, con filtros por fecha, sección, organismo y operadores booleanos. Y así facilitar su análisis.

La arquitectura tiene dos grandes bloques:

1. Flujo de datos. Kestra orquesta la descarga jerárquica del archivo (años, boletines, disposiciones). Los documentos HTML en crudo se almacenan en MinIO como data lake. Parsers en Python extraen el texto y los metadatos, y DLT los carga en PostgreSQL. Vistas de métricas monitorizan la cobertura y calidad de los datos en cada nivel.

2. Consulta web. Una aplicación Next.js con TypeScript, Tailwind CSS y Prisma que conecta directamente a PostgreSQL. Ofrece búsqueda de texto completo con la configuración de español de PostgreSQL (tsvector/tsquery), paginación semántica por año-boletín-disposición y una página de métricas que muestra con transparencia el estado de la descarga y extracción de datos.

Soy la única persona detrás del proyecto, así que por el momento todo el contenido editorial se gestiona como Markdown y YAML, sin CMS.

Toda la infraestructura corre sobre Docker Compose, tanto el pipeline (Kestra + MinIO + PostgreSQL) como el frontend (Next.js + PostgreSQL) con soporte para Traefik como proxy inverso en producción.

El proyecto está en desarrollo: ya descarga y procesa boletines, ofrece búsqueda funcional y muestra métricas de calidad de datos en tiempo real. Seguiré compartiendo avances por aquí.

hashtag#DataEngineering hashtag#AprendeEnPúblico hashtag#DataTalksClub hashtag#PostgreSQL hashtag#NextJS hashtag#Kestra hashtag#DatosAbiertos hashtag#IslasCanarias
