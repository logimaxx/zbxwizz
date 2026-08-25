# Import & export

Bring data into sheets, then export CSV or XLS, or chart frequencies. Writing back to Zabbix is covered in [Zabbix operations](zabbix-operations.md).

---

## Import from Zabbix

**Data → Import from Zabbix**

Fetches via `{resource}.get` and loads the result into the **active sheet** (replacing its current data).

| Field | Description |
|-------|-------------|
| **Resource** | API resource: `host`, `hostgroup`, `template`, `trigger`, `item`, `problem`, `event`, … |
| **Request editor** | JSON **params** only (not a full JSON-RPC envelope) |
| **Templates** | Save/load named requests (localStorage) |
| **Preview** | Compiles the template; green = valid JSON/JS, red = error |

Use the **?** control next to the resource (where available) to open the matching Zabbix API docs.

### Safety limit

If the params omit a numeric `limit`, ZbxWizz injects **`limit: 5`** on every `*.get`. When the result length equals the applied limit, you get a warning so you know there may be more data. Set an explicit `limit` whenever you need a larger page.

### Example requests

**Five hosts with tags:**

```json
{"limit": 5, "selectTags": ["tag", "value"]}
```

**Hosts in a host group:**

```json
{
  "groupids": ["YOUR_GROUP_ID"],
  "selectTags": ["tag", "value"],
  "selectInterfaces": ["interfaceid", "ip", "port", "type"],
  "limit": 100
}
```

**Items for a host:**

```json
{
  "hostids": ["YOUR_HOST_ID"],
  "selectTags": ["tag", "value"],
  "limit": 100
}
```

See the [Zabbix API reference](https://www.zabbix.com/documentation/current/en/manual/api/reference) for `select*` options and filters.

### How imported data is stored

| Location | Contents |
|----------|----------|
| Table cells (`flds` / `cols`) | Flat string values; nested objects JSON-stringified |
| `data.csv` | Original API object for that row (immutable sidecar for transforms) |
| `data.{label}` | Results attached later by **Pull** |

---

## Import from CSV

**Data → Import CSV**

- File or pasted text, parsed with Papa Parse (`header: true`)
- Header names become field names
- Choose a target sheet (new or existing)

Tips:

- Prefer UTF-8
- Quote fields that contain commas
- Name the host ID column `hostid` if you plan to push host updates without editing templates

---

## Import from XLS

**Data → Import XLS**

- Accepts `.xls` / `.xlsx` (SheetJS)
- Load the workbook, pick which Excel sheets to import
- Each selected Excel sheet becomes a ZbxWizz sheet with the same name
- Optional: overwrite/reset the existing workbook first

Useful for round-trips with Excel, or for onboarding inventories maintained as spreadsheets.

---

## Import from JavaScript

**Data → Import from JavaScript**

Write a script body that **returns an array of objects**. Keys of the first object become columns:

```javascript
return [
  { hostid: "10001", name: "web-01", note: "production" },
  { hostid: "10002", name: "web-02", note: "staging" }
];
```

Or generate rows:

```javascript
return Array.from({length: 10}, (_, i) => ({
  hostid: String(10000 + i),
  name: "test-host-" + i,
  status: "0"
}));
```

Use this for synthetic test data or reshaping sources before they hit the table. For cross-sheet logic, prefer transforms / the script editor after import — this importer evaluates a plain function body and loads the returned array.

---

## Export to CSV

**Data → Export to CSV**

| Option | Rows included |
|--------|---------------|
| All records | Every row in the sheet |
| Only selected | Checked rows |
| Only visible | Rows passing all filters |

You can also restrict which columns are exported. Output uses Papa Parse (quoted fields, header row). Values export as shown in the table (string form). CSV always exports the **active sheet** only.

---

## Export to XLS

**Data → Export to XLS**

Builds a single `.xlsx` workbook (SheetJS) with one Excel worksheet per selected ZbxWizz sheet:

| Option | Behaviour |
|--------|-----------|
| Sheets | Multi-select; all sheets selected by default |
| All / selected / visible records | Same row filters as CSV, applied **per sheet** |

All columns of each sheet are included (header row even if a sheet has no rows). Sheet names are sanitized to Excel limits (31 characters; invalid characters replaced).

---

## Chart data

**Data → Chart data**

Builds a Chart.js view of the active sheet:

| Control | Behaviour |
|---------|-----------|
| Records | Visible (default), selected, or all |
| Category column | Frequency of values — **top 20** as bar or pie |
| Clock column (optional) | Unix seconds or ms → histogram by **hour of day** or **calendar day** |

Empty category values appear as `(empty)`. Unparseable clocks are counted in the chart meta line.

Typical use after importing `problem` / `event` history: filter noise, then chart top problem names and busy hours. See [Examples](examples.md).

---

## Request templates

In Import, Pull, and Push dialogs you can **save** the current editor content as a named template. Templates persist in localStorage and appear in the dropdown.

| Dialog | Storage key prefix |
|--------|--------------------|
| Import from Zabbix | `importReqTpl_` |
| Import from JavaScript | `importJSTpl*` |
| Pull | `pullReqTpl_` |
| Push | `pushReqTpl_` |

Select a template and remove it from the dialog when you no longer need it.

---

## Not yet available

- Export JSON of the sheet alone (use **Environment → Save** for a full workbook export)
