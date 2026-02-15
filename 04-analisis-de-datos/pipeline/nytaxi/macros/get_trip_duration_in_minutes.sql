{% macro get_trip_duration_minutes(pickup_datetime, dropoff_datetime) %}
    {{ dbt.datediff(pickup_datetime, dropoff_datetime, 'minute') }}
{% endmacro %}
