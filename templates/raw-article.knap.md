---
{{ title | yaml_property:"title" }}
{{ url | yaml_property:"source_url" }}
{{ clipped_at | yaml_property:"clipped_at" }}
{{ author | yaml_property:"author" }}
{{ published | yaml_property:"published" }}
{{ domain | yaml_property:"domain" }}
{{ site | yaml_property:"site" }}
{{ wordCount | yaml_property:"word_count" }}
type: article
tags: [inbox, unread]
acquired_with: defuddle
---

# {{ title }}

> Source: [{{ domain }}]({{ url }})
> Clipped: {{ clipped_at }}
{% if author %}> Author: {{ author }}
{% endif %}{% if published %}> Published: {{ published }}
{% endif %}{% if description %}> {{ description }}
{% endif %}
{{ content }}
