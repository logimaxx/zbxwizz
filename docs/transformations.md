# Transformations

Column transforms are JavaScript expressions evaluated **once per visible cell** in that column. Open the column index menu → **Transform**, check the preview, then apply.

Hidden (filtered-out) rows are not transformed.

---

## Expression context

Each expression runs with these bindings:

| Name | Description |
|------|-------------|
| `self` | Current cell value (before transform) |
| `cols` | Array of cell values by column index (`cols[0]` = first data column) |
| `flds` | Object of cell values keyed by field name |
| `$0`, `$1`, … | Legacy aliases for `cols[N]` |
| `_ColumnName` | Legacy aliases for `flds.ColumnName` |
| `data` | Row sidecar — `data.csv` (original import), `data.zbx` / custom Pull labels |
| `ws` | All worksheets — `ws.sheet1`, `ws.MySheet`, … |
| `lastResponse` | Last Zabbix API response for this row (Pull/Push) |
| `lastError` | Last error for this row |
| `json()` | `JSON.stringify` shorthand |
| `obj()` | `JSON.parse` shorthand |
| `formatUnix()` | Unix seconds or ms → locale date/time string |
| `parseUnixMs()` | Parse Unix seconds/ms to a millisecond timestamp |

Standard JavaScript operators and built-ins are available.

Objects returned from expressions are JSON-stringified for display in the cell when needed.

---

## Helper functions

```javascript
json(value)        // JSON.stringify(value)
obj(string)        // JSON.parse(string)
formatUnix(value)  // Unix seconds or ms → locale date/time string
parseUnixMs(value) // Unix seconds or ms → number (ms)
```

Typical pattern for nested API fields:

```javascript
json(obj(data.csv.tags).concat({"tag":"env","value":"prod"}))
```

Convert a Zabbix `clock` column:

```javascript
formatUnix(self)
```

Or use the column menu **Format as date/time** for a one-click convert of visible cells (this **mutates** stored and exported values).

---

## Legacy vs modern names

These are equivalent:

```javascript
flds.hostname
_hostname

cols[2]
$2
```

New examples in this documentation use `flds` / `cols`.

---

## Saved expressions

The transform dialog can:

- Load saved expressions (`transfo_*` in localStorage)
- Save the current expression
- Delete a saved expression

---

## DataTable API (`ws.sheetName`)

Access another sheet (or the current one by name):

```javascript
ws.sheet1.rows          // array of Row objects
ws.sheet1.col(2)        // all cells in column 2, or .col("hostid")
ws.sheet1.get_row(0)    // row by index
ws.sheet1.lookup(subject, searchCol, valueCol, regexp?)
ws.sheet1.lookup2(terms, valueCol, regexp?, defaultOnEmpty?)
```

### `lookup(subject, searchCol, valueCol, regexp?)`

Find the first row where `searchCol` matches `subject`, return `valueCol`.

| Parameter | Type | Description |
|-----------|------|-------------|
| `subject` | string | Value or regex pattern to match |
| `searchCol` | number or string | Column index or field name to search |
| `valueCol` | number or string | Column to return |
| `regexp` | boolean | If true, treat `subject` as regex (default: exact match, case-insensitive) |

**Example — map host to asset ID from a lookup sheet:**

```javascript
ws.assets.lookup(flds.hostname, "hostname", "asset_id", false)
```

### `lookup2(terms, valueCol, regexp?, defaultOnEmpty?)`

Multi-column exact match. `terms` is an object of field → value pairs; every pair must match the same row.

```javascript
ws.assets.lookup2({ hostid: flds.hostid, env: "prod" }, "owner", false, "")
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `terms` | object | e.g. `{ hostid: "1001", env: "prod" }` |
| `valueCol` | number or string | Column to return from the matched row |
| `regexp` | boolean | Treat term values as regex (default: exact, case-insensitive) |
| `defaultOnEmpty` | any | Returned when no row matches |
---

## Row object (in scripts / debug)

When iterating `ws.sheet1.rows` or inspecting row debug info:

| Property / method | Description |
|-------------------|-------------|
| `cells` | Array of Cell objects |
| `vals` | Array of cell values by column index |
| `fld_vals` | Object of field name → value |
| `isHidden` | `true` if filtered out |
| `isSelected` | `true` if checkbox checked |
| `data` | Attached data objects |
| `cell(idx)` | Cell by index or field name |

---

## Common patterns

**Copy value from another column**

```javascript
cols[0]
```

**Uppercase a field**

```javascript
flds.hostname.toUpperCase()
```

**Compose a name from several columns (legacy style still fine)**

```javascript
flds.CountryCode + " - " + flds.DevType + " - " + flds.IP
```

**Build JSON for a push column**

```javascript
json([{"tag":"owner","value":cols[2]}])
```

**Conditional value**

```javascript
cols[3] === "0" ? "disabled" : "enabled"
```

**Count pulled items**

```javascript
data.items ? data.items.length : 0
```

**Cross-sheet lookup**

```javascript
ws.assets.lookup(flds.hostid, "hostid", "owner", false) || "unknown"
```

---

## Preview vs Apply

| Action | Behaviour |
|--------|-----------|
| Editing the expression | Updates preview using the first **visible** row |
| **Apply** | Runs on all **visible** rows in the column |

Errors in expressions show as the error message string in the cell.

---

## Tips

- Use **filters** to limit which rows get transformed before Apply
- Keep complex enrichment in a **Pull**, then transform the flattened result
- Double-click a field name to rename columns for clearer `flds` references
- Prefer small, readable expressions; use the script editor for multi-step automation

See [Examples](examples.md) for full walkthroughs.
