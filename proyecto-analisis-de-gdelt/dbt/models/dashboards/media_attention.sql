-- Media Attention: number of mentions over time per event, enriched with actor names.
SELECT
    m.window_start,
    m.window_end,
    m.global_event_id,
    m.mention_count,
    e.actor1_name,
    e.actor2_name,
    e.event_root_code,
    erc.description AS event_root_description
FROM {{ source('gdelt', 'media_attention') }} AS m
LEFT JOIN {{ source('gdelt', 'events') }} AS e USING (global_event_id)
LEFT JOIN {{ ref('event_root_code') }} AS erc USING (event_root_code)
