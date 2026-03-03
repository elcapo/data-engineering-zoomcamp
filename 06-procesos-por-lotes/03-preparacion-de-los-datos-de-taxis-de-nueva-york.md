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
* Descarga el fichero usando wget.
* Muestra mensajes de progreso con colores para facilitar la lectura.

El resultado queda organizado así:

```
data/
└── raw/
    └── yellow/
        ├── yellow_tripdata_2020_01.csv.gz
        ├── yellow_tripdata_2020_02.csv.gz
        └── ...
```

#### Detalles de implementación

El script es una versión modificada del [script provisto por el curso](https://github.com/DataTalksClub/data-engineering-zoomcamp/blob/main/06-batch/code/download_data.sh), que ha sido reescrita siguiendo varios principios:

* Fallo rápido: detenerse ante el primer error.
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
FILENAME="${TAXI_TYPE}_tripdata_${YEAR}_${FORMATTED_MONTH}.csv.gz"
```

Se construye el nombre del archivo usando interpolación clara.

Luego:

```bash
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

##### Descarga

```bash
wget -nc "${DOWNLOAD_URL}" -O "${TARGET_FILENAME}"
```

* `-nc` evita descargar ficheros que ya existen localmente.
* `-O` permite controlar exactamente dónde se guarda el fichero.

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
