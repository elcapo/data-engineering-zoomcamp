-- Event Volume: events per 15-minute window, broken down by CAMEO root code.
SELECT
    ec.window_start,
    ec.window_end,
    ec.event_root_code,
    erc.description AS event_root_description,
    SUM(ec.event_count) AS event_count
FROM {{ source('gdelt', 'event_counts_by_country') }} AS ec
LEFT JOIN {{ ref('event_root_code') }} AS erc USING (event_root_code)
GROUP BY 1, 2, 3, 4
