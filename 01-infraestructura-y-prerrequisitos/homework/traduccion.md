# Tarea del Módulo 1: Docker & SQL

## Pregunta 1. Entender las imágenes de Docker

> Ejecuta docker con la imagen `python:3.13`. Usa un entrypoint `bash` para interactuar con el contenedor. ¿Cuál es la versión de `pip` en la imagen?

Podemos verificar la versión de pip con el comando:

```bash
echo "pip --version" | docker run --rm -i --entrypoint=/bin/bash python:3.13
```

Lo cual produce:

> pip 25.3 from /usr/local/lib/python3.13/site-packages/pip (python 3.13)

Por lo tanto, la respuesta es **25.3**.

## Pregunta 2. Entender el networking de Docker y docker-compose

> Dado el siguiente `docker-compose.yaml`, ¿cuál es el `hostname` y el `port` que pgadmin debe usar para conectarse a la base de datos postgres?

```yaml
services:
  db:
    container_name: postgres
    image: postgres:17-alpine
    environment:
      POSTGRES_USER: 'postgres'
      POSTGRES_PASSWORD: 'postgres'
      POSTGRES_DB: 'ny_taxi'
    ports:
      - '5433:5432'
    volumes:
      - vol-pgdata:/var/lib/postgresql/data

  pgadmin:
    container_name: pgadmin
    image: dpage/pgadmin4:latest
    environment:
      PGADMIN_DEFAULT_EMAIL: "pgadmin@pgadmin.com"
      PGADMIN_DEFAULT_PASSWORD: "pgadmin"
    ports:
      - "8080:80"
    volumes:
      - vol-pgadmin_data:/var/lib/pgadmin

volumes:
  vol-pgdata:
    name: vol-pgdata
  vol-pgadmin_data:
    name: vol-pgadmin_data
```

El host será accesible a través de su nombre de servicio, `db`, y el puerto abierto será el interno, `5432`, lo que significa que la respuesta es **db:5432**.

Esto se puede comprobar iniciando sesión en **pgadmin** e introduciendo las credenciales correspondientes.

![Screenshot of pgadmin](images/pgadmin.png)

## Preparar los datos

Descarga los datos de viajes de taxis verdes para noviembre de 2025, incluyendo el dataset con las zonas:

```python
from urllib.request import urlretrieve

tripdata_url = "https://d37ci6vzurychx.cloudfront.net/trip-data/green_tripdata_2025-11.parquet"
zones_url = "https://github.com/DataTalksClub/nyc-tlc-data/releases/download/misc/taxi_zone_lookup.csv"

urlretrieve(tripdata_url, "tripdata.parquet")
urlretrieve(zones_url, "zones.csv")
```

## Pregunta 3. Contar viajes cortos

> Para los viajes en noviembre de 2025 (lpep_pickup_datetime entre '2025-11-01' y '2025-12-01', excluyendo el límite superior), ¿cuántos viajes tuvieron una `trip_distance` menor o igual a 1 milla?

Una vez que se han descargado los archivos, podemos leerlos con:

```python
import pandas as pd

trips = pd.read_parquet('tripdata.parquet')
```

Entonces podemos realizar la consulta propuesta con:

```python
trips[
  (trips.lpep_pickup_datetime >= '2025-11-01') &
  (trips.lpep_pickup_datetime < '2025-12-01') &
  (trips.trip_distance <= 1)
].shape[0]
```

> **8,007**

## Pregunta 4. Viaje más largo de cada día

> ¿Cuál fue el día de recogida con la mayor distancia de viaje? Solo considera viajes con `trip_distance` menor a 100 millas (para excluir errores en los datos).

```python
(
  trips
    [trips.trip_distance < 100]
    [['lpep_pickup_datetime', 'trip_distance']]
    .sort_values(by=['trip_distance'], ascending=False)
    .head(1)
)
```

> **2025-11-14**

## Pregunta 5. Mayor zona de recogida

> ¿Cuál fue la zona de recogida con el mayor `total_amount` (suma de todos los viajes) el 18 de noviembre de 2025?

```python
(
  trips
    [(trips.lpep_pickup_datetime >= '2025-11-18') & (trips.lpep_pickup_datetime < '2025-11-19')]
    [['PULocationID', 'total_amount']]
    .groupby(by='PULocationID')
    .sum()
    .sort_values(by='total_amount', ascending=False)
)
```

> **East Harlem North**

## Pregunta 6. Mayor propina

> Para los pasajeros recogidos en la zona llamada "East Harlem North" en noviembre de 2025, ¿cuál fue la zona de destino que tuvo la mayor propina?

```python
pickup_zone_id = zones[zones.Zone == 'East Harlem North'].index[0]

best_tips_by_drop_off_zone = (
    trips
        [(trips.PULocationID == pickup_zone_id) & (trips.lpep_pickup_datetime >= '2025-11-01') & (trips.lpep_pickup_datetime < '2025-12-01')]
        [['DOLocationID', 'tip_amount']]
        .sort_values(by='tip_amount', ascending=False)
)

drop_off_zone_id = best_tips_by_drop_off_zone.iloc[0].DOLocationID
drop_off_zone = zones[zones.LocationID == drop_off_zone_id]
```

> **Yorkville West**

## Pregunta 7. Flujo de trabajo de Terraform

¿Cuál de las siguientes secuencias describe, respectivamente, el flujo de trabajo para:
1. Descargar los plugins del proveedor y configurar el backend,
2. Generar cambios propuestos y auto-ejecutar el plan
3. Eliminar todos los recursos gestionados por terraform`

> **terraform init, terraform apply -auto-approve, terraform destroy**
