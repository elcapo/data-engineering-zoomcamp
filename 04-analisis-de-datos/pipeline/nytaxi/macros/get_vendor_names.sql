{% macro get_vendor_names(vendor_id) -%}
CASE
    WHEN {{ vendor_id }} = 1 THEN 'Creative Mobile Technologies'
    WHEN {{ vendor_id }} = 2 THEN 'VeriFone Inc.'
    WHEN {{ vendor_id }} = 4 THEN 'Unknown/Other'
END
{%- endmacro %}
