En artículos anteriores he hablado del flujo de datos, los parsers y las búsquedas. Hoy toca hablar de dónde corre todo esto y cómo Docker me permite tratar la infraestructura como ficheros.

El proyecto se despliega en dos máquinas virtuales en Clouding.io conectadas por una red interna. La primera ejecuta el flujo de datos: Kestra, MinIO y un PostgreSQL exclusivo para el estado interno de Kestra. La segunda ejecuta el frontend: PostgreSQL con los datos del BOC y la aplicación Next.js. Kestra escribe en el PostgreSQL del frontend a través de la red interna y el frontend lee de esa misma base de datos para servir las búsquedas.

Toda la infraestructura está definida en ficheros Docker Compose. El flujo de datos tiene un docker-compose.yml con cuatro servicios (Kestra, su PostgreSQL, MinIO y un cliente que inicializa los buckets). El frontend tiene dos: uno para PostgreSQL y otro para la aplicación web. Ambos comparten una red Docker (boc-postgres-network) que en producción mapea a la red interna de Clouding.

Lo interesante de este enfoque es que los mismos ficheros que definen la infraestructura de producción sirven para desarrollar en local. Hago `docker compose up` en mi portátil y tengo el mismo entorno: los mismos servicios, las mismas redes, las mismas variables de entorno. No hay sorpresas al desplegar porque no hay diferencia entre entornos.

Para las partes que sí varían entre local y producción (como la exposición de puertos o el proxy inverso), uso ficheros compose complementarios. En local uso docker-compose.port.yml para exponer puertos directamente. En producción uso docker-compose.traefik.yml, que configura Traefik como proxy inverso con certificados TLS de Let's Encrypt.

Las imágenes también están definidas como código. El frontend usa un Dockerfile multietapa que genera una imagen optimizada de Next.js. El flujo de datos usa un Dockerfile propio (boc-python) que preinstala DLT, el cliente de MinIO y todos los parsers como paquetes Python. Kestra ejecuta sus tareas Python dentro de contenedores basados en esa imagen.

El resultado es un proyecto donde todo lo necesario para reproducir el entorno completo está en el repositorio: servicios, redes, volúmenes, imágenes y configuración. Clonas el repo, ajustas las variables de entorno y levantas. Sin documentación de setup manual, sin pasos implícitos.

#DataEngineering #AprendeEnPúblico #DataTalksClub #Docker #IaC #CloudComputing #DatosAbiertos
