# Análisis de datos

## Tests en **dbt**

* Vídeo original (en inglés): [dbt Tests](https://www.youtube.com/watch?v=bvZ-rJm7uMU)

Los tests de un flujo de datos tienen dos propósitos bien diferenciados. Por un lado, detectar errores en los datos que estamos procesando. Por otro, detectar errores en el código que estamos usando para procesarlos. Pero además de estos dos tipos de tests, existen muchas más cuestiones que podemos usar para clasificar nuestros tests.

### Tests singulares

Estos tests consisten en consultas que añadiremos en la carpeta `tests` y que serán ejecutados por **dbt** automáticamente siguiendo el criterio que ya habíamos avanzando el sesiones anteriores: si el test devuelve algún registro, se considera fallido.

```sql
SELECT
    order_id,
    SUM(amount) AS total_amount
FROM {{ ref('fact_payments') }}
GROUP BY all
HAVING sum(amount) < 0
```

### Frescura de las fuentes

Los tests de frescura de las fuentes hacen lo que su nombre indica: poner caducidad a los datos en función de la fecha de su carga para asegurarnos de que no estamos procesando datos antiguos. Esta funcionalidad resulta útil para evaluar el estado de salud de nuestro flujo de datos y es crítica para para monitorizar el cumplimiento de nuestras Garantías de Nivel de Servicio (SLA's).

#### Configuración

Para usar la capacidad de **dbt** de comprobar la frescura de nuestros datos, podemos usar el parámetro de configuración `freshness`:

```yaml
sources:
  - name: jaffle_shop
    database: raw
    config: 
      freshness: # Frescura por defecto
        warn_after: {count: 12, period: hour}
        error_after: {count: 24, period: hour}
      loaded_at_field: _etl_loaded_at

    tables:
      - name: orders
        config:
          freshness: # Frescura para el modelo `orders`
            warn_after: {count: 6, period: hour}
            error_after: {count: 12, period: hour}

      - name: customers # Para este modelo se usaría la frescura por defecto

      - name: product_skus
        config:
          freshness: null # Para este modelo no se comprobaría su frescura
```

Fuente: [Declaring source freshness · dbtLabs Documentation](https://docs.getdbt.com/docs/build/sources#source-data-freshness).

#### Comprobación

Para decirle a **dbt** que lance las comprobaciones de frescura, disponemos de un comando específico.

```bash
uv run dbt source freshness
```

### Tests genéricos

Otro tipo de tests que también podemos definir vía configuración, son los genéricos. Estos tests podemos vincularlos a cada una de las columnas de nuestros modelos. Y disponemos de cuatro tipos de tests genéricos predefinidos: `not_null`, `unique`, `accepted_values` y `relationship`.

```yaml
models:
  - name: orders
    columns:
      - name: order_id
        tests:
          - unique
          - not_null
      - name: status
        tests:
          - accepted_values:
            values: ['placed', 'shiped', 'completed', 'returned']
      - name: customer_id
        tests:
          - relationships:
            to: ref('customers')
            field: id
```

#### Test genéricos personalizados

Además de estos cuatro tipos genéricos predefinidos, podemos crear nuestros propios tests. Para esto, crearíamos un fichero SQL en `tests/generics` haciendo que acepte al menos uno de los dos parámetros:

- `model`: modelo para el que el test ha sido definido,
- `column_name` columna para la que el test ha sido definido.

```sql
{% test is_even(model, column_name) %}

SELECT {{ column_name }}
FROM {{ model }}
WHERE {{ column_name }} % 2 = 1

{% endtest %}
```

Fuente: [Writing custom generic tests · dbtLabs Documentation](https://docs.getdbt.com/best-practices/writing-custom-generic-tests)

### Tests unitarios

Los tests unitarios tienen como objetivo ayudarnos a comprobar nuestro código, por lo que la manera de escribirlos es algo diferente. Si, por ejemplo, tuviésemos entre nuestras transformaciones una que alimentase nuestro modelo para la dimensión de clientes a partir de una tabla `staging_customers` añadiendo un campo `is_valid_email`:

```sql
WITH customers AS (
    SELECT * FROM {{ ref('staging_customers') }}
),
check_valid_emails as (
    SELECT
        customers.customer_id,
        customers.email,
	    regexp_like(customers.email, '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$') AS is_valid_email_address
    FROM customers
)
SELECT * FROM check_valid_emails
```

Sería útil poder comprobar esa función que determina la validez de los correos electrónicos a base de configurar algunos casos conocidos en los que sabemos qué valor debería retornar. Para esto, disponemos

```yaml
unit_tests:
  - name: test_is_valid_email_address
    description: "Comprueba la validez de los correos electrónicos de nuestros clientes"
    model: dimension_customers
    given:
      - input: ref('staging_customers')
        rows:
          - {email: cool@example.com}
          - {email: badgmail.com}
          - {email: missingdot@gmailcom}
    expect:
      rows:
        - {email: cool@example.com,    is_valid_email_address: true}
        - {email: badgmail.com,        is_valid_email_address: false}
        - {email: missingdot@gmailcom, is_valid_email_address: false}
```

Fuente: [Unit testing a model · dbtLabs Documentation](https://docs.getdbt.com/docs/build/unit-tests)

### Contratos de modelos

Por último, **dbt** nos permite definir ciertas restricciones y asignar tipos de datos a las columnas de nuestros modelos. Además, podemos pedir que se comporte de forma estricta usando el parámetro `enforced`. Al hacerlo, si **dbt** encuentra algún registro que no cumpla las especificaciones datas, fallará.

```yaml
models:
  - name: dimension_customers
    config:
      contract:
        enforced: true
    columns:
      - name: customer_id
        data_type: int
        constraints:
          - type: not_null
      - name: customer_name
        data_type: string
```

Fuente: [Model contracts · dbtLabs Documentation](https://docs.getdbt.com/docs/mesh/govern/model-contracts)
