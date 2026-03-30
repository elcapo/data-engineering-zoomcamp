CREATE TABLE IF NOT EXISTS boc_dataset.organizations (
    organization TEXT NOT NULL,
    dispositions INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT organizations_pkey PRIMARY KEY (organization)
);
