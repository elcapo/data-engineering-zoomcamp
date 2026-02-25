# Tarea del Módulo 5: Plataformas de Datos con Bruin

### Pregunta 1. Estructura de un pipeline en Bruin

> En un proyecto Bruin, ¿cuáles son los archivos/directorios obligatorios?

- **`.bruin.yml` y `pipeline/` con `pipeline.yml` y `assets/`**

---

### Pregunta 2. Estrategias de materialización

> Estás construyendo un pipeline que procesa datos de taxis de Nueva York organizados por mes según `pickup_datetime`. ¿Qué estrategia incremental es la más adecuada para procesar un intervalo de tiempo concreto eliminando e insertando datos para ese período?

- **`time_interval` - incremental basado en una columna de tiempo**

---

### Pregunta 3. Variables del pipeline

> Tienes la siguiente variable definida en `pipeline.yml`:

```yaml
variables:
  taxi_types:
    type: array
    items:
      type: string
    default: ["yellow", "green"]
```

> ¿Cómo la sobreescribes al ejecutar el pipeline para procesar únicamente los taxis amarillos?

- **`bruin run --var 'taxi_types=["yellow"]'`**

---

### Pregunta 4. Ejecución con dependencias

> Has modificado el asset `ingestion/trips.py` y quieres ejecutarlo junto con todos los assets posteriores. ¿Qué comando deberías usar?

- **`bruin run ingestion/trips.py --downstream`**

---

### Pregunta 5. Comprobaciones de calidad

> Quieres asegurarte de que la columna `pickup_datetime` de tu tabla de viajes nunca tenga valores NULL. ¿Qué comprobación de calidad deberías añadir a la definición de tu asset?

- **`name: not_null`**

---

### Pregunta 6. Linaje y dependencias

Tras construir tu pipeline, quieres visualizar el grafo de dependencias entre los assets. ¿Qué comando de Bruin deberías usar?

- **`bruin lineage`**

---

### Pregunta 7. Primera ejecución

Vas a ejecutar un pipeline de Bruin por primera vez en una base de datos DuckDB nueva. ¿Qué flag deberías usar para asegurarte de que las tablas se crean desde cero?

- **`--full-refresh`**

---

## Envío de soluciones

- Formulario de envío: <https://courses.datatalks.club/de-zoomcamp-2026/homework/hw5>