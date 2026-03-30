CREATE TABLE IF NOT EXISTS boc_dataset.sections (
    section TEXT NOT NULL,
    dispositions INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT sections_pkey PRIMARY KEY (section)
);
