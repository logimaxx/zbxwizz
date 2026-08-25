# ZbxWizz documentation

ZbxWizz is a spreadsheet-style client for the Zabbix API. Import configuration (or CSV/XLS), transform it with JavaScript, chart or export it, and push create/update/delete operations back to Zabbix — all in the browser.

**Full guides (recommended):** [https://zbxwizz.app/docs/](https://zbxwizz.app/docs/)

| Guide | Topics |
|-------|--------|
| [Getting started](https://zbxwizz.app/docs/getting-started) | Connect → import → transform → push |
| [Installation](https://zbxwizz.app/docs/installation) | Deploy beside Zabbix UI or try locally |
| [User interface](https://zbxwizz.app/docs/user-interface) | Menus, sheets, filters, IndexedDB |
| [Import & export](https://zbxwizz.app/docs/import-export) | Zabbix / CSV / XLS / JS · CSV · charts |
| [Zabbix operations](https://zbxwizz.app/docs/zabbix-operations) | Pull, Push, query modes, safety |
| [Transformations](https://zbxwizz.app/docs/transformations) | Expression context and helpers |
| [Examples](https://zbxwizz.app/docs/examples) | Copy-paste recipes |

Sources live in this repository under [`docs/`](https://github.com/logimaxx/zbxwizz/tree/main/docs).

---

## Mental model

```text
  Data → Import (Zabbix / CSV / XLS / JavaScript)
                    │
                    ▼
         Edit sheet (filter · transform · pull)
                    │
                    ▼
  Data → Export CSV / Chart    or    Zabbix ops → Push
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
| Query mode | `sequential` (safest writes) · `hybrid` · `parallel` |

Bright red logo = connection OK. Settings are stored in localStorage. Optional `preset_env.json` can seed URL/token/mode when nothing is saved yet.

---

## Import briefly

| Path | Notes |
|------|--------|
| **Data → Import from Zabbix** | `{resource}.get` params only; nested objects become JSON strings in cells; original object in `data.csv` |
| **Data → Import CSV** | Header row required |
| **Data → Import XLS** | Each Excel sheet → a ZbxWizz sheet |
| **Data → Import from JavaScript** | Script must `return` an **array of objects** |

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
| Portable workbook | **Environment → Save / Load** (`.json`, sheets only) |

---

## Safety

1. Test Push on one or two rows first.
2. Prefer sequential query mode for large writes.
3. Filter before “select all visible”.
4. Save an environment file and/or CSV before risky deletes.
5. Check token permissions in Zabbix.

---

## Charts

**Data → Chart data** — top-20 category frequencies (bar/pie) and optional clock histograms (hour of day or calendar day). Uses visible rows by default.

---

## More help

- In-app: **Help → ZbxWizz documentation** (this page)
- Website: [https://zbxwizz.app/docs/](https://zbxwizz.app/docs/)
- Zabbix API: [https://www.zabbix.com/documentation/current/en/manual/api](https://www.zabbix.com/documentation/current/en/manual/api)
