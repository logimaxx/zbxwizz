# Examples

Copy-paste starting points for common tasks. Adjust column indices and field names to match your sheet. Always set an explicit `limit` on imports (unbounded `.get` defaults to 5).

---

## Import hosts with tags and interfaces

**Data → Import from Zabbix** · Resource: `host`

```json
{
  "limit": 50,
  "selectTags": ["tag", "value"],
  "selectInterfaces": ["interfaceid", "ip", "dns", "type", "main"]
}
```

---

## Import hosts by tag

```json
{
  "tags": [
    {"tag": "environment", "value": "production"}
  ],
  "selectTags": ["tag", "value"],
  "limit": 200
}
```

---

## Add a tag to all visible hosts

Transform on the **tags** column:

```javascript
json(obj(data.csv.tags).concat({"tag":"reviewed","value":"2026-06-14"}))
```

Push template (**Zabbix ops → Push** · `host` · `update`):

```json
{
  "hostid": "${flds.hostid}",
  "tags": ${cols[YOUR_TAGS_COL_INDEX]}
}
```

---

## Bulk-update host visible name

Transform on the `name` column:

```javascript
flds.name.replace(/^OLD-/, "NEW-")
```

Push:

```json
{
  "hostid": "${flds.hostid}",
  "name": "${flds.name}"
}
```

---

## Pull items for selected hosts

1. Import hosts (with `hostid`)
2. Select rows
3. **Zabbix ops → Pull** · Resource: `item` · Label: `items`

```json
{
  "hostids": ["${flds.hostid}"],
  "output": ["itemid", "name", "key_"],
  "limit": 500
}
```

4. Transform a new column to show item count:

```javascript
data.items ? String(data.items.length) : "0"
```

---

## Pull hosts by interface IP

Sheet has an `IP` column. **Pull** · Resource: `hostinterface` · Label: `ifaces`

```json
{
  "filter": { "ip": "${flds.IP}" },
  "selectHosts": ["hostid", "host", "name"],
  "output": ["interfaceid", "ip"]
}
```

Then transform to extract the first linked host id, for example:

```javascript
data.ifaces && data.ifaces[0] && data.ifaces[0].hosts
  ? data.ifaces[0].hosts[0].hostid
  : ""
```

---

## Import triggers for a template

**Import from Zabbix** · Resource: `trigger`

```json
{
  "templateids": ["YOUR_TEMPLATE_ID"],
  "selectTags": ["tag", "value"],
  "expandDescription": true,
  "limit": 500
}
```

---

## Disable hosts matching a pattern

1. Import hosts
2. Filter **name** · Contains · `decom` (escape regex metacharacters if needed)
3. Select visible rows
4. Push · `host` · `update`

```json
{
  "hostid": "${flds.hostid}",
  "status": 1
}
```

(`status: 1` = disabled in the host API)

---

## Create host groups from a list

Sheet column `name` with group names. Push · `hostgroup` · `create`:

```json
{
  "name": "${flds.name}"
}
```

---

## Delete triggers by ID

1. Import triggers with `triggerid`
2. Filter and select carefully — test one row first
3. Push · `trigger` · **delete**

```json
{
  "triggerid": "${flds.triggerid}"
}
```

---

## Cross-sheet asset lookup

**Sheet `hosts`:** imported hosts  
**Sheet `assets`:** CSV/XLS with `hostid` and `owner`

On `hosts`, transform an `owner` column:

```javascript
ws.assets.lookup(flds.hostid, "hostid", "owner", false) || ""
```

---

## Bulk onboarding from CSV / XLS

1. Prepare a spreadsheet with at least `host`, `name`, and any macros/tags you need
2. **Data → Import CSV** or **Import XLS**
3. Use transforms to build JSON columns (tags, interfaces, macros) as the Zabbix API expects
4. Push · `host` · `create` with a template that references those columns
5. Start with **one** row and **sequential** query mode

Exact create payloads depend on your Zabbix version and required fields — mirror a working UI/API example, then parameterize with `${flds…}` / `${cols[…]}`.

---

## Generate test data (Import from JavaScript)

```javascript
return Array.from({length: 10}, (_, i) => ({
  hostid: String(10000 + i),
  name: "test-host-" + i,
  status: "0"
}));
```

---

## Export only selected rows for review

1. Select rows to review
2. **Data → Export to CSV** → only selected
3. Share the CSV before pushing

To share several sheets at once (e.g. hosts + groups after a bulk edit), use **Data → Export to XLS**, keep the sheets you need selected, and download `export.xlsx`.

---

## Export problem / event history

**Import from Zabbix** · Resource: `problem`

```json
{
  "output": ["eventid", "objectid", "name", "severity", "clock", "r_clock", "r_eventid"],
  "recent": true,
  "sortfield": ["eventid"],
  "sortorder": "DESC",
  "limit": 500
}
```

Time window with Unix seconds:

```json
{
  "output": "extend",
  "time_from": 1719792000,
  "time_till": 1722470400,
  "sortfield": ["clock"],
  "sortorder": "ASC",
  "limit": 1000
}
```

**Import from Zabbix** · Resource: `event` (trigger events):

```json
{
  "output": ["eventid", "objectid", "name", "severity", "clock", "value"],
  "source": 0,
  "object": 0,
  "time_from": 1719792000,
  "sortfield": ["clock"],
  "sortorder": "DESC",
  "limit": 1000
}
```

Then **Data → Export to CSV** (visible or all). Filter noisy names first if needed.

---

## Make clocks human-readable

1. Column menu → **Format as date/time**, or
2. Transform:

```javascript
formatUnix(self)
```

`formatUnix` accepts seconds or milliseconds; empty/invalid values become blank. Stored and exported values change after you apply.

---

## Find top problems and busy periods

After importing problem/event history:

1. Filter out noise (column filter on `name` / severity)
2. **Data → Chart data**
3. Category column = `name` (or host) → bar/pie of top values (top 20)
4. Clock column = `clock`, bucket = hour of day or calendar day → busy periods

Charts use **visible** rows by default, so filters apply.

---

## Save and restore a workspace

Before a risky operation:

1. **Environment → Save** → e.g. `before-tag-migration.json`
2. Run push
3. If needed, **Environment → Load** to restore the workbook

Note: Save does not include API token or request templates.

---

## Further reading

- [Getting started](getting-started.md) — step-by-step first migration
- [Zabbix API reference](https://www.zabbix.com/documentation/current/en/manual/api/reference) — resources and parameters
