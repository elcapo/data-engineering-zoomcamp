# Plataformas de datos

## Introducción a Bruin

* Vídeo original (en inglés): [Bruin Tutorial](https://www.youtube.com/watch?v=f6vg7lGqZx0&list=PL3MmuxUbc_hJed7dXYoJw8DoCuVHhGEQb&index=1&feature=youtu.be)

[Bruin](https://getbruin.com) es una plataforma de datos que ayuda a gestionar los procesos de datos de principio, a fin. Integra funcionalidades que van desde la ingestión, las transformaciones y la orquestación hasta las comprobaciones de calidad de datos y la gestión de metadatos.

## ETL / ELT

A lo largo de este módulo vamos a trabajar con un proyecto que se organiza en base a tres fases:

1. **Extracción** e ingestión de datos: a partir de las diversas fuentes de datos del proyecto,
2. **Transformaciones**: para adecuar los datos a un formato adecuado para su análisis,
3. **Carga**: en el entorno en el que los usuarios consumirán los datos ya transformados.

### Orquestación

Para coordinar los procesos que componen cada una de estas fases, necesitaremos una herramienta que nos ayuda con la orquestación. Esta herramienta se encaragará de la programación de tareas y de determinar en qué orden y con qué condiciones de concurrencia se ejecutarán.

### Gobierno de datos

Desde el punto de vista de los datos, querremos tener una buena gestión de metadatos que nos permita documentar nuestro catálogo de datos, así como una buena política de gobierno de datos que documente y controle el cumplimiento de nuestras políticas de calidad de datos.

## Primeros pasos con Bruin

* Vídeo original (en inglés): [Getting Started with Bruin](https://www.youtube.com/watch?v=JJwHKSidX_c&list=PL3MmuxUbc_hJed7dXYoJw8DoCuVHhGEQb&index=3)

### Instalación

Para trabajar con Bruin, el primer paso es [instalar su herramienta de línea de comandos](https://getbruin.com/docs/bruin/getting-started/introduction/installation.html):

```bash
curl -LsSf https://getbruin.com/install/cli | sh
```

Una vez completada la instalación, conviene comprobarla:

```bash
bruin version
```

### Creación del proyecto

En nuestro caso hemos creado el proyecto en el subdirectorio [pipelines/chess-pipeline/](pipelines/chess-pipeline/), para lo que hemos usado `bruin init` escogiendo el perfil por defecto:

```bash
mkdir pipelines
cd pipelines

bruin init chess chess-pipeline
```

### Estructura del proyecto

Con esto, habremos creado:

* un fichero [chess-pipeline/pipeline.yml](pipelines/chess-pipeline/pipeline.yml) con la configuración del flujo de datos,
* un directorio [chess-pipeline/assets/](pipelines/chess-pipeline/assets/) con tres artefactos a modo de ejemplo.

#### Archivo de conexiones: `.bruin.yml`

Adicionalmente, Bruin escala en tu árbol de directorios en busca de un directorio raíz `.git` y, si lo encuentra, añade allí un `.gitignore` y un archivo de configuración de conexiones: `.bruin.yml`.

```yaml
default_environment: default
environments:
    default:
        connections:
            duckdb:
                - name: duckdb-default
                  path: duckdb.db
            chess:
                - name: chess-default
                  players:
                    - MagnusCarlsen
                    - Hikaru
```

En nuestro caso, como queremos tener más de una pipeline en un mismo directorio y que cada una tenga su archivo de conexiones independiente, moveremos el archivo a la carpeta [chess-pipeline/](chess-pipeline/).

A partir de ahora, tendremos que añadir una referencia al fichero de conexiones cuando queramos lanzar comandos `bruin` usando el atributo `--config-file`:

```bash
cd chess-pipeline

bruin validate --config-file .bruin.yml
```

#### Flujos de datos

El fichero [pipeline.yml](chess-pipeline/pipeline.yml) contiene la configuración de nuestro proyecto. En Bruin, un flujo de datos no es más que un conjunto de artefactos que se ejecutan en un cierto orden.

```yaml
name: chess_duckdb
catchup: false
default:
  type: ingestr
  parameters:
    source_connection: chess-default
    destination: duckdb
```

### Artefactos

En cuanto a los artefactos, son cualquier cosa que pueda ejecutarse como parte de nuestros flujos de datos y que, eventualmente, genera datos de algún tipo. En un proyecto Bruin, viven en la carpeta [assets/](pipelines/chess-pipeline/assets/).

El proyecto de ajedrez, por ejemplo, genera tres artefactos por defecto:

* [assets/chess_games.asset.yml](pipelines/chess-pipeline/assets/chess_games.asset.yml)
* [assets/chess_profiles.asset.yml](pipelines/chess-pipeline/assets/chess_profiles.asset.yml)
* [assets/player_summary.sql](pipelines/chess-pipeline/assets/player_summary.sql)

#### Artefactos YAML

Los primeros dos artefactos describen fuentes de datos desde las que leeremos datos. En nuestro caso, partidas y jugadores:

```yaml
# chess_games.asset.yml
name: chess_playground.games
parameters:
  source_table: games

# chess_profiles.asset.yml
name: chess_playground.profiles
parameters:
  source_table: profiles
```

#### Artefactos SQL

El tercer artefacto materializa "al vuelo" una tabla que nos permitirá consumir de forma analítica la información de partidas y jugadores. El fichero comienza con una  parte declarativa, en la que especificamos las dependencias de nuestro artefacto y sus columnas, entre otras cosas.

```sql
/* @bruin

name: chess_playground.player_summary
type: duckdb.sql
materialization:
   type: table

depends:
   - chess_playground.games
   - chess_playground.profiles

columns:
  - name: total_games
    type: integer
    description: "the games"
    checks:
      - name: positive

@bruin */
```

Y continúa con la consulta que transforma los datos de partidas y jugadores en un resumen listo para su análisis.

```sql
WITH game_results AS (
    SELECT
        CASE
            WHEN g.white->>'result' = 'win' THEN g.white->>'@id'
            WHEN g.black->>'result' = 'win' THEN g.black->>'@id'
            ELSE NULL
            END AS winner_aid,
        g.white->>'@id' AS white_aid,
    g.black->>'@id' AS black_aid
FROM chess_playground.games g
)

SELECT
    p.username,
    p.aid,
    COUNT(*) AS total_games,
    COUNT(CASE WHEN g.white_aid = p.aid AND g.winner_aid = p.aid THEN 1 END) AS white_wins,
    COUNT(CASE WHEN g.black_aid = p.aid AND g.winner_aid = p.aid THEN 1 END) AS black_wins,
    COUNT(CASE WHEN g.white_aid = p.aid THEN 1 END) AS white_games,
    COUNT(CASE WHEN g.black_aid = p.aid THEN 1 END) AS black_games,
    ROUND(COUNT(CASE WHEN g.white_aid = p.aid AND g.winner_aid = p.aid THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN g.white_aid = p.aid THEN 1 END), 0), 2) AS white_win_rate,
    ROUND(COUNT(CASE WHEN g.black_aid = p.aid AND g.winner_aid = p.aid THEN 1 END) * 100.0 / NULLIF(COUNT(CASE WHEN g.black_aid = p.aid THEN 1 END), 0), 2) AS black_win_rate
FROM chess_playground.profiles p
LEFT JOIN game_results g
       ON p.aid IN (g.white_aid, g.black_aid)
GROUP BY p.username, p.aid
ORDER BY total_games DESC
```

## Materialización de datos

Para pedir a Bruin que materialice estas consultas en la base de datos DuckDB que configuramos, podemos usar `bruin run`:

```bash
bruin run --config-file .bruin.yml
```

![Datos de ajedrez cargados en DuckDB](resources/screeenshots/datos-de-ajedrez-cargados-en-duckdb.png)
