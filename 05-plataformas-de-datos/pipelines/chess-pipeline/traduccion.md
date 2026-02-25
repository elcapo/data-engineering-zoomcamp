# Bruin - Plantilla de ajedrez

Este pipeline es un ejemplo sencillo de un pipeline de Bruin. Muestra cómo usar la CLI de `bruin` para construir y ejecutar un pipeline.

El pipeline ya incluye tres assets de ejemplo:
- `chess_games.asset.yml`: Transfiere datos de partidas de ajedrez desde la base de datos de origen a DuckDB.
- `chess_profiles.asset.yml`: Transfiere datos de perfiles de jugadores de ajedrez desde el origen a DuckDB.
- `player_summary.sql`: Crea una tabla resumen con las estadísticas de los jugadores, incluyendo partidas, victorias y tasas de victoria con piezas blancas/negras.

## Configuración
El pipeline ya incluye un archivo `.bruin.yml` vacío; rellénalo con tus conexiones y entornos. Puedes leer más sobre las conexiones [aquí](https://getbruin.com/docs/bruin/commands/connections.html).

Aquí tienes un ejemplo de archivo `.bruin.yml`:

```yaml
environments:
    default:
        connections:
            duckdb:
                - name: "duckdb-default"
                  path: "/ruta/a/tu/base_de_datos.db"

            chess:
                - name: "chess-connection"
                  players:
                      - "MagnusCarlsen"
                      - "Hikaru"
```

Puedes cambiar de entorno fácilmente usando el flag `--environment`, por ejemplo:


## Ejecución del pipeline

La CLI de bruin puede ejecutar el pipeline completo o cualquier tarea con sus dependencias posteriores:

```shell
bruin run ./chess/pipeline.yml
```

También puedes ejecutar una única tarea:

```shell
bruin run assets/hello.py                            
```

```shell
Starting the pipeline execution...

[2023-03-16T18:25:59Z] [worker-0] Running: hello
[2023-03-16T18:26:00Z] [worker-0] [hello] >> Hello, world!
[2023-03-16T18:26:00Z] [worker-0] Completed: hello (103ms)


Executed 1 tasks in 103ms
```

Opcionalmente puedes pasar el flag `--downstream` para ejecutar la tarea junto con todas sus dependencias posteriores.

¡Eso es todo, buena suerte!