# Almacenes de datos

## Desplegar modelos de aprendizaje automático

* Vídeo original (en inglés): [Deploying Machine Learning model](https://www.youtube.com/watch?v=BjARzEWaznU&list=PL3MmuxUbc_hJed7dXYoJw8DoCuVHhGEQb&index=29)

Una vez que hemos entrenado nuestro modelo de aprendizaje automático en BigQuery, el siguiente paso natural es desplegarlo para poder usarlo en producción. BigQuery nos permite exportar modelos entrenados y servirlos mediante TensorFlow Serving, lo que nos permite hacer predicciones en tiempo real desde cualquier aplicación.

En esta sesión veremos cómo exportar el modelo que creamos en la sesión de [aprendizaje automático en BigQuery](05-aprendizaje-automatico-en-bigquery.md) y desplegarlo localmente usando Docker.

### Requisitos previos

Antes de comenzar, asegúrate de tener instalados:

- Google Cloud SDK (`gcloud` y `bq`)
- Docker
- Un modelo entrenado en BigQuery (usaremos `zoomcamp.tip_model` del ejemplo anterior)
- Una cuenta de Google Cloud con acceso a BigQuery y Cloud Storage

### Autenticación en Google Cloud

El primer paso es autenticarnos en Google Cloud para poder interactuar con los servicios de BigQuery y Cloud Storage.

```bash
gcloud auth login
```

Este comando abrirá una ventana del navegador donde deberás iniciar sesión con tu cuenta de Google Cloud. Una vez autenticado, podrás ejecutar comandos que interactúen con tus recursos en la nube.

### Exportar el modelo desde BigQuery

Para poder usar nuestro modelo fuera de BigQuery, primero necesitamos exportarlo a Cloud Storage. BigQuery permite exportar modelos en formato TensorFlow, que es compatible con TensorFlow Serving.

```bash
bq \
    --project_id zoomcamp-ingenieria-datos \
    extract \
    -m zoomcamp.tip_model \
    gs://newyork-taxi/tip_model
```

Desglosemos este comando:

- `bq`: Herramienta de línea de comandos para interactuar con BigQuery
- `--project_id zoomcamp-ingenieria-datos`: Especifica el identificador del proyecto de Google Cloud
- `extract`: Indica que queremos extraer un modelo
- `-m zoomcamp.tip_model`: El modelo que queremos exportar, en formato `conjunto_de_datos.nombre_del_modelo`
- `gs://newyork-taxi/tip_model`: La ubicación en Cloud Storage donde se guardará el modelo exportado

Este proceso puede tardar unos minutos dependiendo del tamaño del modelo. BigQuery exportará el modelo en un formato que TensorFlow Serving puede entender.

### Crear la estructura de directorios

TensorFlow Serving espera que los modelos estén organizados en una estructura de directorios específica. Crearemos los directorios necesarios para alojar nuestro modelo localmente.

```bash
mkdir -p bigquery_model/tip_model/v1
```

Este comando crea una estructura de directorios anidados:

- `bigquery_model/`: Directorio raíz para todos nuestros modelos
- `tip_model/`: Directorio específico para nuestro modelo
- `v1/`: Directorio de versión (TensorFlow Serving usa versiones numéricas para gestionar diferentes versiones de un mismo modelo)

La opción `-p` asegura que se creen todos los directorios intermedios si no existen.

### Descargar el modelo desde Cloud Storage

Ahora que tenemos la estructura de directorios preparada, necesitamos descargar el modelo que exportamos a Cloud Storage en el paso anterior.

```bash
gsutil \
    cp \
    -r \
    gs://newyork-taxi/tip_model \
    bigquery_model/tip_model/v1
```

Analicemos este comando:

- `gsutil`: Herramienta de línea de comandos para interactuar con Cloud Storage
- `cp`: Comando de copia (similar a `cp` en sistemas Unix)
- `-r`: Copia recursiva, necesaria porque estamos copiando un directorio completo con múltiples archivos
- `gs://newyork-taxi/tip_model`: La ubicación origen en Cloud Storage (la misma donde exportamos el modelo)
- `bigquery_model/tip_model/v1`: El directorio local de destino

Este comando descargará todos los archivos del modelo, incluyendo los pesos, la arquitectura y los metadatos necesarios para hacer predicciones.

### Descargar la imagen de TensorFlow Serving

TensorFlow Serving es un sistema flexible y de alto rendimiento para servir modelos de aprendizaje automático en producción. Usaremos la imagen oficial de Docker para ejecutarlo.

```bash
docker pull tensorflow/serving
```

Este comando descarga la imagen oficial de TensorFlow Serving desde Docker Hub. La imagen incluye todo lo necesario para servir modelos de TensorFlow de forma optimizada.

### Ejecutar TensorFlow Serving con nuestro modelo

Ahora que tenemos el modelo descargado y la imagen de Docker lista, podemos ejecutar TensorFlow Serving para servir nuestro modelo.

```bash
docker run -p 8501:8501 \
  --mount type=bind,source=$(pwd)/bigquery_model/tip_model,target=/models/tip_model \
  -e MODEL_NAME=tip_model \
  -t tensorflow/serving &
```

Este comando es más complejo, analicémoslo por partes:

- `docker run`: Ejecuta un contenedor de Docker
- `-p 8501:8501`: Mapea el puerto 8501 del contenedor al puerto 8501 de tu máquina local (TensorFlow Serving usa este puerto para la API REST)
- `--mount type=bind,source=$(pwd)/bigquery_model/tip_model,target=/models/tip_model`: Monta el directorio local con el modelo dentro del contenedor
  - `type=bind`: Tipo de montaje (vincula un directorio del sistema anfitrión)
  - `source=$(pwd)/bigquery_model/tip_model`: Ruta absoluta al modelo en tu máquina (usa `$(pwd)` para obtener el directorio actual)
  - `target=/models/tip_model`: Ruta donde el modelo estará disponible dentro del contenedor
- `-e MODEL_NAME=tip_model`: Define una variable de entorno con el nombre del modelo
- `-t tensorflow/serving`: La imagen de Docker a usar
- `&`: Ejecuta el contenedor en segundo plano

Una vez ejecutado, TensorFlow Serving comenzará a cargar el modelo. Puedes verificar que está funcionando revisando los registros del contenedor o esperando unos segundos antes de hacer una petición.

### Hacer predicciones con el modelo desplegado

Finalmente, podemos usar nuestro modelo desplegado para hacer predicciones en tiempo real. Enviaremos una petición HTTP con los datos de entrada y recibiremos la predicción.

```bash
curl -d '{"instances": [{"passenger_count":1, "trip_distance":12.2, "PULocationID":"193", "DOLocationID":"264", "payment_type":"2","fare_amount":20.4,"tolls_amount":0.0}]}' \
  -X POST http://localhost:8501/v1/models/tip_model:predict \
  -H "Content-Type: application/json"
```

Desglosemos esta petición:

- `curl`: Herramienta para hacer peticiones HTTP
- `-d '{"instances": [...]}'`: Los datos que enviamos en formato JSON
  - `instances`: Lista de instancias para las que queremos predicciones
  - Cada instancia contiene las características que nuestro modelo espera:
    - `passenger_count`: Número de pasajeros (1)
    - `trip_distance`: Distancia del viaje en millas (12.2)
    - `PULocationID`: Identificador de la zona de recogida ("193")
    - `DOLocationID`: Identificador de la zona de destino ("264")
    - `payment_type`: Tipo de pago ("2" para efectivo)
    - `fare_amount`: Tarifa del viaje (20.4)
    - `tolls_amount`: Cantidad de peajes (0.0)
- `-X POST`: Especifica que es una petición POST
- `http://localhost:8501/v1/models/tip_model:predict`: La URL del punto de acceso de predicción
  - `localhost:8501`: Nuestro servidor local
  - `v1`: Versión de la API
  - `models/tip_model`: El nombre del modelo
  - `:predict`: Acción de predicción
- `-H "Content-Type: application/json"`: Indica que enviamos datos en formato JSON

Si todo funciona correctamente, recibirás una respuesta con la predicción de propina para el viaje especificado:

```json
{
  "predictions": [2.58]
}
```

Este valor representa la propina estimada en dólares para un viaje con las características especificadas.

### Verificar el estado del contenedor

Si tienes problemas o quieres verificar que el contenedor está funcionando correctamente, puedes usar estos comandos útiles:

```bash
# Ver contenedores en ejecución
docker ps

# Ver los registros del contenedor
docker logs <container_id>

# Detener el contenedor
docker stop <container_id>
```

### Consideraciones para producción

Este ejemplo muestra un despliegue local básico, pero para un entorno de producción deberías considerar:

- **Escalabilidad**: Usar servicios gestionados como AI Platform Prediction o Kubernetes para manejar múltiples instancias
- **Monitorización**: Implementar herramientas para monitorizar el rendimiento y la precisión del modelo
- **Gestión de versiones**: TensorFlow Serving permite servir múltiples versiones de un modelo simultáneamente
- **Seguridad**: Añadir autenticación y cifrado a las peticiones
- **Balanceo de carga**: Distribuir las peticiones entre múltiples instancias para mayor disponibilidad
