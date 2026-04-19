---
type: home
tags: [home, dashboard]
---

# Gnosis — Home

Personal LLM wiki. This page uses **live Dataview queries** — tables rebuild every time you open them from the current state of the vault.

> If you see raw ```dataview blocks instead of rendered tables, the Dataview plugin is disabled. Enable it in Settings → Community plugins.

## Quick stats

Total pages by type:

```dataview
TABLE length(rows) AS "Pages"
FROM ""
WHERE type
GROUP BY type
SORT length(rows) DESC
```

## People in Siva's network

```dataview
TABLE role, company, based-in, file.mtime AS "Last edited"
FROM ""
WHERE type = "person"
SORT file.name ASC
```

## Companies and institutions

```dataview
TABLE website, join(tags, ", ") AS "Tags", length(file.inlinks) AS "Inbound"
FROM ""
WHERE type = "company"
SORT length(file.inlinks) DESC
```

## Sources, most recently ingested first

```dataview
TABLE authors, published, length(file.inlinks) AS "Cited by"
FROM ""
WHERE type = "source"
SORT published DESC, file.mtime DESC
```

## Concepts, by inbound-link density

```dataview
TABLE join(tags, ", ") AS "Tags", length(file.outlinks) AS "Out", length(file.inlinks) AS "In"
FROM ""
WHERE type = "concept"
SORT length(file.inlinks) DESC
```

## AI engines and search products

```dataview
TABLE join(tags, ", ") AS "Tags", length(file.inlinks) AS "Inbound"
FROM ""
WHERE type = "entity"
SORT length(file.inlinks) DESC
```

## Recently updated across the whole vault

```dataview
TABLE type, join(tags, ", ") AS "Tags", file.mtime AS "Updated"
FROM ""
WHERE type
SORT file.mtime DESC
LIMIT 12
```

## Orphans — pages with no inbound links

Candidates for better cross-referencing.

```dataview
LIST
FROM ""
WHERE type AND length(file.inlinks) = 0
SORT file.name ASC
```

## Siva's orbit — anything tagged siva / progrowth / founder

```dataview
LIST file.link
FROM #siva OR #progrowth OR #founder
SORT type ASC, file.name ASC
```

## Companies grouped by primary tag

```dataview
TABLE length(rows) AS "Pages", rows.file.link AS "Companies"
FROM ""
WHERE type = "company"
FLATTEN tags AS tag
WHERE tag != "company"
GROUP BY tag
SORT length(rows) DESC
LIMIT 10
```

## India / Telangana cluster — cross-type

Reveals who's geographically / institutionally clustered.

```dataview
TABLE type, join(tags, ", ") AS "Tags"
FROM ""
WHERE type AND (contains(tags, "india") OR contains(tags, "telangana") OR contains(tags, "shared-connection"))
SORT type ASC, file.name ASC
```

## Tag-cloud-ish: tags ranked by usage

```dataview
TABLE length(rows) AS "Pages"
FROM ""
WHERE type
FLATTEN tags AS tag
GROUP BY tag
SORT length(rows) DESC
LIMIT 20
```

## Navigation

- [[wiki/index|wiki/index.md]] — the canonical index the LLM maintains (plain markdown, no Dataview)
- [[log|log.md]] — chronological activity log
- [[CLAUDE|CLAUDE.md]] — the schema the LLM follows
- `raw/` — immutable source documents (PDFs, articles, notes) — browse in the Explorer
