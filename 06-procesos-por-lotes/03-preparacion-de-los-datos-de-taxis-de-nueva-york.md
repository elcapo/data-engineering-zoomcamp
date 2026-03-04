# Procesos por lotes

## Preparación de los datos de taxis de Nueva York

* Vídeo original (en inglés): [Preparing Yellow and Green Taxi Data](https://www.youtube.com/watch?v=CI3P4tAtru4&list=PL3MmuxUbc_hJed7dXYoJw8DoCuVHhGEQb&index=57)

Esta va a ser una sesión práctica durante la que vamos a preparar nuestra configuración para descargar los ficheros de taxis verdes y amarillos que usaremos durante las próximas sesiones de PySpark.

### Script de descarga de datos

Vamos a empezar por preparar un script para descargar automáticamente los datos mensuales de viajes de taxi de NYC desde el repositorio público de DataTalksClub. El script descargará los 12 meses de un año concreto para un tipo de taxi determinado (yellow, green, etc.) y los guarda organizados en disco.

#### Cómo funciona

Al llamar al script [download.sh](pipelines/pyspark-pipeline/scripts/download.sh):

```bash
./scripts/download.sh yellow 2020
```

El script:

* Valida que se hayan pasado los argumentos necesarios.
* Recorre los 12 meses del año.
* Construye dinámicamente el nombre del fichero.
* Genera la URL de descarga.
* Crea la carpeta local si no existe.
* Comprueba si el fichero ya existe y lo omite si es el caso.
* Descarga el fichero a un fichero temporal y lo mueve al destino final si la descarga tiene éxito.
* Muestra mensajes de progreso con colores para facilitar la lectura.

El resultado queda organizado así:

```
data/
└── raw/
    └── yellow/
        ├── yellow_tripdata_2020-01.csv.gz
        ├── yellow_tripdata_2020-02.csv.gz
        └── ...
```

#### Detalles de implementación

El script es una versión modificada del [script provisto por el curso](https://github.com/DataTalksClub/data-engineering-zoomcamp/blob/main/06-batch/code/download_data.sh), que ha sido reescrita siguiendo varios principios:

* Validación temprana de argumentos.
* Construcción declarativa de variables.
* Legibilidad antes que micro-optimizaciones.
* Salida clara y diferenciada visualmente.
* Código mínimo, sin funciones innecesarias.

#### Explicación paso a paso

##### Shebang

```bash
#!/bin/bash
```

* `#!/bin/bash` asegura que se ejecute con Bash.

Esto evita estados intermedios inconsistentes (por ejemplo, descargas parciales).

##### Definición de colores ANSI

```bash
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NO_COLOR='\033[0m'
```

Se definen constantes para los colores usando códigos ANSI.

Ventajas:

* No repetimos secuencias crípticas por el código.
* Si queremos cambiar colores, solo tocamos esta sección.
* Mantiene el script limpio.

##### Lectura de argumentos

```bash
TAXI_TYPE=$1
YEAR=$2
```

Se leen los parámetros posicionales:

* `$1`: tipo de taxi.
* `$2`: año.

Ejemplo:

```bash
./scripts/download.sh yellow 2020
```

##### Validación temprana

```bash
if [ -z "$TAXI_TYPE" ] || [ -z "$YEAR" ]; then
  ...
  exit 1
fi
```

Se usa `-z` para comprobar si la variable está vacía.

¿Por qué hacerlo al inicio?

* Evita ejecutar lógica innecesaria.
* Hace el comportamiento del script predecible.
* Mejora la experiencia de usuario.

##### Bucle de meses

```bash
for MONTH in {1..12}; do
```

Se usa expansión de **Bash** para recorrer los 12 meses.

Después se convierte el número `${MONTH}` en una cadena formateada de 2 dígitos:

```bash
FORMATTED_MONTH=$(printf "%02d" ${MONTH})
```

##### Construcción declarativa de nombres

```bash
FILENAME="${TAXI_TYPE}_tripdata_${YEAR}-${FORMATTED_MONTH}.csv.gz"
```

Se construye el nombre del archivo usando interpolación clara. Nótese el guión (`-`) como separador entre año y mes, que es el formato usado por el repositorio de DataTalksClub.

Luego se define la URL base por separado y se compone la URL completa:

```bash
DOWNLOAD_BASEURL="https://github.com/DataTalksClub/nyc-tlc-data/releases/download"
DOWNLOAD_URL="${DOWNLOAD_BASEURL}/${TAXI_TYPE}/${FILENAME}"
```

Separar variables mejora:

* Legibilidad.
* Debugging.
* Reutilización.

##### Organización de carpetas

```bash
LOCAL_PATH="data/raw/${TAXI_TYPE}"
mkdir -p "${LOCAL_PATH}"
```

* `-p` evita errores si la carpeta ya existe.

Se organiza por tipo de taxi para mantener ordenados los datos.

##### Comprobación de fichero existente

Antes de descargar, el script verifica si el fichero ya existe:

```bash
if [ -f "${TARGET_FILENAME}" ]; then
  printf "${YELLOW}↷ Ya existe:${NO_COLOR} %s\n" "${TARGET_FILENAME}"
  continue
fi
```

Esto hace el script idempotente: puede ejecutarse varias veces sin repetir descargas ya completadas.

##### Descarga con fichero temporal

```bash
TEMP_FILE="${TARGET_FILENAME}.tmp"

if wget -q --show-progress "${DOWNLOAD_URL}" -O "${TEMP_FILE}"; then
  mv "${TEMP_FILE}" "${TARGET_FILENAME}"
  printf "${GREEN}✔ Guardado en:${NO_COLOR} %s\n" "${TARGET_FILENAME}"
else
  rm -f "${TEMP_FILE}"
  printf "${YELLOW}⚠ No existe:${NO_COLOR} %s\n" "$FILENAME"
fi
```

Se descarga primero a un fichero temporal (`.tmp`) y, solo si la descarga tiene éxito, se mueve al destino final. Si falla (por ejemplo, porque el fichero no existe en el repositorio para ese mes), se elimina el temporal y se muestra un aviso. Esto evita dejar ficheros corruptos o incompletos en disco.

##### Salida coloreada

Se usa **printf** en lugar de echo para:

* Controlar mejor el formato.
* Garantizar compatibilidad.
* Incluir colores sin efectos inesperados.

Código de colores:

* Acción: azul
* Confirmación: verde
* Errores: rojo
* Uso: amarillo

Mejora la experiencia cuando se ejecuta en terminal.

#### Descarga de los datos

Gracias a que el script es rápido cuando los ficheros ya han sido descargados, podemos lanzar este sencillo script tanto para descargar los ficheros desde cero, como para descargar ficheros faltantes en cualquier momento.

```bash
# Yellow taxis
./scripts/download.sh yellow 2019
./scripts/download.sh yellow 2020
./scripts/download.sh yellow 2021

# Green taxis
./scripts/download.sh green 2019
./scripts/download.sh green 2020
./scripts/download.sh green 2021
```

### Exploración de datos

Ahora que tenemos una estructura de carpetas con los datos de taxis amarillos y verdes comprimidos, es un buen momento para hacer una primera exploración de datos usando herramientas de línea de comandos.

#### Uso de `zcat`

Una primera herramienta que es muy útil para examinar el contenido de archivos comprimidos sin necesidad de descomprimirlos previamente es `zcat`, que no solo devuelve el contenido de un archivo sino que podemos usarla en cadenas de "pipes" para combinarla con otras herramientas.

```bash
zcat data/raw/yellow/yellow_tripdata_2019-01.csv.gz | wc -l
```

```
7667793
```

#### Uso de `zless`

Para examinar el contenido de un fichero comprimido por páginas, podemos usar `zless`:

```bash
zless data/raw/yellow/yellow_tripdata_2019-01.csv.gz
```

#### Uso de `zgrep`

Para buscar una cadena dentro de uno o más ficheros comprimidos, podemos usar `zgrep`:

```bash
zgrep 2019-01-01 data/raw/yellow/yellow_tripdata_2019-*.csv.gz
```

#### Conteo de líneas

Con todo esto, podemos preparar un script que cuente las líneas de cada uno de los ficheros sin descomprimirlos (incluyendo sus cabeceras):

```bash
count_lines() {
  for FILE in `ls`; do
      echo $FILE": "`zcat $FILE | wc -l`;
  done;
}

clear

cd data/raw/yellow;
count_lines

cd ../green;
count_lines
```

```
yellow_tripdata_2019-01.csv.gz: 7667793
yellow_tripdata_2019-02.csv.gz: 7019376
yellow_tripdata_2019-03.csv.gz: 7832546
yellow_tripdata_2019-04.csv.gz: 7433140
yellow_tripdata_2019-05.csv.gz: 7565262
yellow_tripdata_2019-06.csv.gz: 6941025
...
green_tripdata_2019-01.csv.gz: 630919
green_tripdata_2019-02.csv.gz: 575686
green_tripdata_2019-03.csv.gz: 601103
green_tripdata_2019-04.csv.gz: 514393
green_tripdata_2019-05.csv.gz: 504888
green_tripdata_2019-06.csv.gz: 471053
...
```
