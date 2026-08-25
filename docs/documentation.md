# ZbxWizz documentation

ZbxWizz is a spreadsheet-style client for the Zabbix API. Import configuration (or CSV/Excel), transform it with JavaScript, chart or export it, and push create/update/delete operations back to Zabbix — all in the browser.

| Guide | Topics |
|-------|--------|
| [Getting started](getting-started.md) | Connect → import → transform → push |
| [Installation](installation.md) | Deploy beside Zabbix UI or try locally |
| [User interface](user-interface.md) | Menus, sheets, filters, IndexedDB |
| [Import & export](import-export.md) | Zabbix / CSV / Excel / JS · CSV / Excel · charts |
| [Zabbix operations](zabbix-operations.md) | Pull, Push, query modes, safety |
| [Transformations](transformations.md) | Expression context and helpers |
| [Examples](examples.md) | Copy-paste recipes |

Online mirror: [https://zbxwizz.app/docs/](https://zbxwizz.app/docs/). Sources: [`docs/`](https://github.com/logimaxx/zbxwizz/tree/main/docs).

---

## Mental model

```text
  Data → Import (Zabbix / CSV / Excel / JavaScript)
                    │
                    ▼
         Edit sheet (filter · transform · pull)
                    │
                    ▼
  Data → Export CSV / Excel / Chart    or    Zabbix → Push
```

- Work happens in **sheets** (workbook tabs).
- **Pull / Push** only run on rows that are **selected and visible**.
- Unbounded API `.get` calls default to **`limit: 5`** — always set an explicit limit when you need more.

---

## Connect

Click the **Zabbix logo** (top right):

| Field | Typical value |
|-------|----------------|
| API URL | `api_jsonrpc.php` on the Zabbix frontend, else full URL |
| Token | *Users → API tokens* |
| Query mode | Sequential (safest writes) · Hybrid · Parallel |

Bright red logo = connection OK. Settings are stored in localStorage. Optional `preset_env.json` can seed URL/token/mode when nothing is saved yet.

---

## Import briefly

| Path | Notes |
|------|--------|
| **Data → Import → From Zabbix** | `{resource}.get` params only; nested objects become JSON strings in cells; original object in `data.csv` |
| **Data → Import → CSV** | Header row required |
| **Data → Import → Excel** | Each Excel sheet → a ZbxWizz sheet |
| **Data → Import → From JavaScript** | Script must `return` an **array of objects** |

---

## Transform briefly

Column menu → **Transform**. Expression bindings include `self`, `flds`, `cols`, `data`, `ws`, `json()`, `obj()`, `formatUnix()`, `lastResponse`, `lastError`. Legacy `$0` / `_ColumnName` still work.

Example — append a tag:

```javascript
json(obj(data.csv.tags).concat({"tag":"reviewed","value":"yes"}))
```

**Format as date/time** runs `formatUnix(self)` on visible cells (mutates stored values).

---

## Pull / Push briefly

Templates are JS template literals:

```json
{
  "hostid": "${flds.hostid}",
  "tags": ${cols[3]}
}
```

- Prefer `${flds.name}` / `${cols[n]}`; `${$n}` and `${_name}` remain valid.
- Pull stores results under `data.{label}` (default `zbx`).
- Push operations: `create` · `update` · `delete` — confirm carefully; no undo.

---

## Persistence

| What | Where |
|------|--------|
| Sheet list + row data | **IndexedDB** (`zbxwizz`) |
| URL, token, templates, transforms | **localStorage** |
| Portable workbook | **File → Save / Load** (`.json`, sheets only) |

---

## Safety

1. Test Push on one or two rows first.
2. Prefer **Sequential** query mode for large writes.
3. Filter before “select all visible”.
4. Save a workbook file (**File → Save**) and/or CSV/Excel before risky deletes.
5. Check token permissions in Zabbix.

---

## Charts

**Data → Chart data** — top-20 category frequencies (bar/pie) and optional clock histograms (hour of day or calendar day). Uses visible rows by default. Export as PNG or aggregated CSV from the dialog. Full menu map: [User interface](user-interface.md).

---

## More help

- In-app: **Help → ZbxWizz documentation** (this page)
- Website: [https://zbxwizz.app/docs/](https://zbxwizz.app/docs/)
- Zabbix API: [https://www.zabbix.com/documentation/current/en/manual/api](https://www.zabbix.com/documentation/current/en/manual/api)
