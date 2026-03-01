# Análisis del Boletín Oficial de Canarias (BOC)

## Fuentes de datos

### Índice de años

* **¿Dónde se encuentra?**
  * https://www.gobiernodecanarias.org/boc/archivo/
* **¿Qué buscamos aquí?**
  * De esta fuente descargamos la página en formato HTML sin alterar y la guardamos como **data/raw/boc/archive.html**.
* **¿Qué flujo se ocupa de la descarga?**
  * [download_year_index](../../flows/download_year_index.yaml)
* **¿Qué hacemos con lo que descargamos de aquí?**
  * Una vez descargado el índice de años de los que se han publicado boletines, extraemos de él los enlaces a los índices de boletines de cada año.

### Índice de boletines de cada año

* **¿Dónde se encuentra?**
  * https://www.gobiernodecanarias.org/boc/archivo/{año}/
  * Ejemplo: https://www.gobiernodecanarias.org/boc/archivo/2026/
* **¿Qué buscamos aquí?**
  * De esta fuente descargamos la página en formato HTML sin alterar y la guardamos como **data/raw/boc/year/{año}.html**.
* **¿Qué flujo se ocupa de la descarga?**
  * [download_year_bulletins](../../flows/download_year_bulletins.yaml)
* **¿Qué hacemos con lo que descargamos de aquí?**
  * Una vez descargado el índice de boletines de un año en concreto, extraemos de él los enlaces a los índices de disposiciones de cada boletín.

### Índice de disposiciones de cada boletín

* **¿Dónde se encuentra?**
  * https://www.gobiernodecanarias.org/boc/{año}/{boletin}/index.html
  * Ejemplo: https://www.gobiernodecanarias.org/boc/2026/001/index.html
* **¿Qué buscamos aquí?**
  * De esta fuente descargamos la página en formato HTML sin alterar y la guardamos como **data/raw/boc/year/{año}/bulletin/{boletin}.html**.
* **¿Qué flujo se ocupa de la descarga?**
  * [download_bulletin_dispositions](../../flows/download_bulletin_dispositions.yaml)
* **¿Qué hacemos con lo que descargamos de aquí?**
  * Una vez descargado el índice de disposiciones de un boletín, extraemos de él los enlaces a sus disposiciones.

### Disposiciones

* **¿Dónde se encuentra?**
  * https://www.gobiernodecanarias.org/boc/{año}/{boletin}/{disposicion}.html
  * Ejemplo: https://www.gobiernodecanarias.org/boc/2026/001/001.html
* **¿Qué buscamos aquí?**
  * De esta fuente descargamos la página en formato HTML sin alterar y la guardamos como **data/raw/boc/year/{año}/bulletin/{boletin}/entries/{disposicion}.html**.
* **¿Qué flujo se ocupa de la descarga?**
  * [download_disposition](../../flows/download_disposition.yaml)
* **¿Qué hacemos con lo que descargamos de aquí?**
  * Una vez descargada una disposición, la procesamos para extraer de ella el texto correspondiente, que guardaremos como **data/staging/boc/year/{año}/bulletin/{boletin}/entries/{disposicion}.md**.
  * El contenido del Markdown, lo guardaremos en la tabla **dispositions** de Postgres.
