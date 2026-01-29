# Orquestación de flujos de datos

## Caso práctico: Primer flujo de datos en Kestra

* Vídeo original (en inglés): [Build Your First Data Pipeline](https://www.youtube.com/watch?v=-KmwrCqRhic)

Como primera aproximación práctica a Kestra, vamos a construir un flujo de datos básico que represente las tres etapas de un proceso ETL: extracción, transformación y carga.

### Extracción

Nuestro proceso empezará por descargarse datos de una API remota:

- https://dummyjson.com/products

En este caso, una API que devuelve datos ficticios de productos en formato JSON.

Aunque podríamos implementar esta descarga con una tarea de código Python, tenemos una opción más sencilla; la tarea **Download**:

```yaml
tasks:
  - id: extract
    type: io.kestra.plugin.core.http.Download
    uri: https://dummyjson.com/products
```

En tareas posteriores podremos referirnos a la salida de la API con la expresión:

```
{{ outputs.extract.uri }}
```

En particular, obtendríamos una salida similar a esta, que hemos truncado a un único producto:

```json
{
    "products": [
        {
            "id": 1,
            "title": "Essence Mascara Lash Princess",
            "description": "The Essence Mascara Lash Princess is a popular mascara known for its volumizing and lengthening effects. Achieve dramatic lashes with this long-lasting and cruelty-free formula.",
            "category": "beauty",
            "price": 9.99,
            "discountPercentage": 10.48,
            "rating": 2.56,
            "stock": 99,
            "tags": [
                "beauty",
                "mascara"
            ],
            "brand": "Essence",
            "sku": "BEA-ESS-ESS-001",
            "weight": 4,
            "dimensions": {
                "width": 15.14,
                "height": 13.08,
                "depth": 22.99
            },
            "warrantyInformation": "1 week warranty",
            "shippingInformation": "Ships in 3-5 business days",
            "availabilityStatus": "In Stock",
            "reviews": [
                {
                    "rating": 3,
                    "comment": "Would not recommend!",
                    "date": "2025-04-30T09:41:02.053Z",
                    "reviewerName": "Eleanor Collins",
                    "reviewerEmail": "eleanor.collins@x.dummyjson.com"
                }
            ],
            "returnPolicy": "No return policy",
            "minimumOrderQuantity": 48,
            "meta": {
                "createdAt": "2025-04-30T09:41:02.053Z",
                "updatedAt": "2025-04-30T09:41:02.053Z",
                "barcode": "5784719087687",
                "qrCode": "https://cdn.dummyjson.com/public/qr-code.png"
            },
            "images": [
                "https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/1.webp"
            ],
            "thumbnail": "https://cdn.dummyjson.com/product-images/beauty/essence-mascara-lash-princess/thumbnail.webp"
        }
    ]
}
```

### Transformación

Como transformación para nuestro proceso lo que haremos es seleccionar ciertas columnas del JSON que nos acabamos de descargar. Nuestro ETL tendrá como propósito guardar un resumen de precios de venta promedio para cada una de las marcas. Por lo que nos sería suficiente con un array de objetos con las propiedades `brand` y `price`.

Para hacer el ejercicio un poco más interesante, vamos a añadir una entrada de datos a nuestro flujo que permita definir qué columnas mantendremos. De forma que al lanzar el proceso podamos especificar una selección de columnas específica para cada ejecución.

```yaml
inputs:
  - id: columns_to_keep
    type: ARRAY
    itemType: STRING
    defaults:
      - brand
      - price
```

En sucesivas tareas, podremos referirnos al valor de esta consulta como:

```
{{ inputs.columns_to_keep }}
```

En cuanto a la transformación de datos, esta vez sí usaremos un script Python para realizar la transformación.

```python
import json
import os

columns_to_keep_str = os.getenv("COLUMNS_TO_KEEP")
columns_to_keep = json.loads(columns_to_keep_str)

with open("data.json", "r") as file:
    data = json.load(file)

filtered_data = [
    {column: product.get(column, "N/A") for column in columns_to_keep}
    for product in data["products"]
]

with open("products.json", "w") as file:
    json.dump(filtered_data, file, indent=4)
```

Del script, llama la atención que nos refiramos al JSON que contiene la lista de columnas a mantener como una variable de entorno. Esto es así porque para pasar el valor de la entrada de datos a nuestro script, usamos la clave `env`. Esta es la pinta que tendría nuestra tarea:

```yaml
  - id: transform
    type: io.kestra.plugin.scripts.python.Script
    containerImage: python:3.11-alpine
    inputFiles:
      data.json: "{{ outputs.extract.uri }}"
    outputFiles:
      - "*.json"
    env:
      COLUMNS_TO_KEEP: "{{ inputs.columns_to_keep }}"
    script: |
      # Aquí iría el script
```

Este script transformaría el JSON inicial de productos en una versión mucho más simple. Asumiendo que lanzamos el script con los valores por defecto _brand_ y _price_, el JSON resultante sería algo así:

```json
[
    {
        "brand": "Essence",
        "price": 9.99
    }
]
```

Y nos referiríamos a él con la expresión:

```
{{ outputs.transform.outputFiles['products.json'] }}
```

### Carga

Finalmente, para nuestra tarea de carga de datos vamos a realizar un contenedor DuckDB que nos permitirá ejecutar una consulta con la que simularemos la inserción en una tabla, sin tener siquiera que crear una.

```yaml
  - id: query
    type: io.kestra.plugin.jdbc.duckdb.Queries
    inputFiles:
      products.json: "{{outputs.transform.outputFiles['products.json']}}"
    sql: |
      INSTALL json;
      LOAD json;
      SELECT brand, round(avg(price), 2) as avg_price
      FROM read_json_auto('{{workingDir}}/products.json')
      GROUP BY brand
      ORDER BY avg_price DESC;
    fetchType: STORE
```

Puedes ver el aspecto del YAML de nuestro flujo completo en [03-getting-started-data-pipeline.yml](resources/flows/03-getting-started-data-pipeline.yml).

Si una vez ejecutado el flujo, abres la ejecución en Kestra y te diriges a la pestaña de salidas (o **Outputs**) podrás ver las salidas individuales generadas por cada una de las tres tareas de nuestro flujo.

Para el último paso, deberías de ver algo así:

![Captura de pantalla de la salida de datos](resources/screenshots/salida-de-datos.png)
