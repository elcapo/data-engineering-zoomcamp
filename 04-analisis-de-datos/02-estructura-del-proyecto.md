# Análisis de datos

## Estructura del proyecto

* Vídeo original (en inglés): [dbt Project Structure](https://www.youtube.com/watch?v=2dYDS4OQbT0)

Cuando inicializamos un proyecto **dbt**, tanto en su versión **Cloud** como **Core**, se crean una serie de archivos y carpetas por defecto. En este módulo vamos a hablar sobre cada uno de ellos.

### El fichero [`README.md`](pipeline/nytaxi/README.md)

Es el fichero de documentación del proyecto. Aquí indicaremos los pasos necesarios para instalarlo o configurarlo.

### El fichero [`dbt_project.yml`](pipeline/nytaxi/dbt_project.yml)

Se trata del archivo de configuración del proyecto **dbt**. En él se define la identidad del proyecto: nombre, versión y perfil de conexión, la ubicación de sus distintos componentes: modelos, tests, _seeds_, instantáneas, _macros_, análisis así como las reglas de comportamiento que **dbt** debe aplicar al ejecutar transformaciones.

También permite configurar materializaciones por defecto: tabla, vista, incremental, esquemas de destino, etiquetas, convenciones de nombres y otras opciones globales que afectan a cómo se compilan y despliegan los modelos en el data warehouse. En resumen, es el punto central donde se establece cómo está estructurado el proyecto y cómo debe comportarse dbt al transformarlo y ejecutarlo.

### La carpeta [`analyses`](pipeline/nytaxi/analyses/)

En esta carpeta guardaremos consultas que no necesariamente van destinadas a los usuarios finales que consumirán nuestros modelos y que tampoco crearán modelos en el almacén de datos. El propósito de esta carpeta es guardar consultas cuyo propósito es realizar auditorías sobre la calidad de los datos.

### La carpeta [`macros`](pipeline/nytaxi/macros/)

Contiene macros escritas en Jinja y SQL que permiten reutilizar lógica repetitiva. Son funciones personalizadas que ayudan a no repetir fragmentos en nuestro código y a mantenerlo más limpio y mantenible.

### La carpeta [`models`](pipeline/nytaxi/models/)

Es el corazón del proyecto. Aquí se definen los modelos, normalmente como consultas SQL (o Python), que transforman datos dentro del almacén de datos. Cada archivo representa una transformación que dbt compila y materializa como tabla, vista o modelo incremental.

#### La subcarpeta [`staging`](pipeline/nytaxi/models/staging)

Es la primera capa después de los datos en bruto. Aquí se limpian y estandarizan los datos provenientes de los sistemas fuente.

- se renombran columnas,
- se reasignan sus tipos de datos,
- se normalizan formatos,
- se aplican pequeñas limpiezas.

La idea es tener una representación coherente y consistente de cada fuente, sin aplicar todavía lógica de negocio compleja. Cada modelo en esta carpeta suele corresponder a una tabla fuente concreta.

#### La subcarpeta [`intermediate`](pipeline/nytaxi/models/intermediate/)

Es la capa intermedia donde empiezan a combinarse y enriquecerse los datos.

- se hacen _joins_ entre distintas fuentes,
- se aplican transformaciones más complejas,
- se preparan estructuras que no están listas aún para consumo final.

Estos modelos no suelen estar pensados para usuarios finales, sino como bloques reutilizables para construir la capa final.

#### La subcarpeta [`marts`](pipeline/nytaxi/models/marts/)

Es la capa de presentación o consumo. Aquí se construyen modelos orientados al negocio:

- tablas de hechos,
- dimensiones,
- métricas agregadas,
- estructuras pensadas para dashboards o análisis.

Esta capa suele seguir principios de modelado dimensional (por ejemplo, esquema en estrella) y está diseñada para ser entendible y eficiente para el análisis. Es la parte más cercana al usuario final.

### La carpeta [`seeds`](pipeline/nytaxi/seeds/)

Contiene archivos CSV que **dbt** carga como tablas dentro del almacén de datos. Se utilizan para pequeños conjuntos de datos estáticos o de referencia como tablas de mapeos. No están pensados para cargar datos operativos desde sistemas fuente.

### La carpeta `snapshots`

Se utilizan para capturar cambios históricos en los datos. Permiten mantener versiones históricas de registros que se actualizan de forma destructiva en el sistema fuente.

### La carpeta `tests`

Aquí se definen tests personalizados. Aunque muchos tests se configuran directamente en archivos YAML junto a los modelos, esta carpeta también permite crear pruebas SQL más complejas, por ejemplo para validar relaciones entre múltiples tablas.

El criterio que sigue **dbt** con estos tests es que no deben devolver ningún registro. Si alguna de las consultas en esta carpeta devuelve algún registro, el proceso de compilación de **dbt** fallará.

## Fuentes

* Vídeo original (en inglés): [dbt Sources](https://www.youtube.com/watch?v=7CrrXazV_8k)

Para permitir a **dbt** que conozca nuestros orígenes de datos, debemos darle información sobre estas. Típicamente, esto lo haremos creando ficheros YAML. Y como vimos en la sección anterior, la primera fase de nuestros flujos es la de `staging`.

### **dbt Core**

Para permitir que **dbt** se conecte con nuestra base de datos DuckDB local, crearemos un fichero [models/staging/sources.yml](pipeline/nytaxi/models/staging/sources.yml):

```yaml
version: 2

sources:
  - name: raw_data
    description: "Registros sin procesar de los taxis de Nueva York"
    database: nytaxi # Nombre de la base de datos DuckDB
    schema: prod
    tables:
      - name: yellow_tripdata
      - name: green_tripdata
```

Por fin, podemos empezar a crear consultas que lean datos de nuestras fuentes. Por ejemplo, para leer datos de nuestra tabla local `green_tripdata` podríamos escribir:

```sql
SELECT * FROM nytaxi.prod.green_tripdata
```

Aquí estaríamos usando la sintaxis `[base_de_datos].[esquema].[tabla]`. Sin embargo, **dbt** tiene una función que nos permite referirnos a la tabla usando únicamente su nombre y el nombre de su fuente:

```sql
SELECT * FROM {{ source('raw_data', 'green_tripdata') }}
```

Nuestra primera consulta es [staging_green_tripdata.sql](pipeline/nytaxi/models/staging/staging_green_tripdata.sql), donde hemos:

1. añadido explícitamente las columnas que querremos incluir en nuestro modelo,
2. ordenado las columnas de forma que sigan un patrón lógico,
3. creado aliases para estandarizar los nombres de las columnas,
4. convertido los tipos de datos allá donde era conveniente,
5. excluido algunas filas.

Siguiendo el mismo criterio también hemos creado [staging_yellow_tripdata.sql](pipeline/nytaxi/models/staging/staging_yellow_tripdata.sql).

### **dbt Cloud**

En el caso de que hubiésemos decidido trabajar con **dbt Cloud**, para permitir que **dbt** se conecte con nuestra base de datos BigQuery remota, crearíamos un fichero **sources.yml** ligeramente diferente:

```yaml
version: 2

sources:
  - name: raw_data
    description: "Registros sin procesar de los taxis de Nueva York"
    database: zoomcamp-ingenieria-datos-2026 # Nombre del proyecto en BigQuery
    schema: zoomcamp_datatalks # Nombre del conjunto de datos en BigQuery
    tables:
      - name: yellow_tripdata
      - name: green_tripdata
```

En cuanto a las consultas que usaríamos para nuestros modelos de `staging` serían idénticas a las que usamos en el caso local.
