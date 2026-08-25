# Zabbix operations

**Pull** and **Push** build Zabbix JSON-RPC calls from templates you write. Both run only on rows that are **selected and visible** in the active sheet.

---

## Template syntax

Request bodies are **JavaScript template literals**. Use `${…}` to inject values from the current row:

| Expression | Meaning | Example |
|------------|---------|---------|
| `${flds.fieldname}` | Cell by column name | `${flds.hostid}` |
| `${cols[N]}` | Cell by 0-based index | `${cols[2]}` |
| `${$N}` | Legacy alias for `cols[N]` | `${$0}` |
| `${_ColumnName}` | Legacy alias for `flds.ColumnName` | `${_IP}` |

Prefer `flds` / `cols` in new templates; legacy forms still work.

The preview panel evaluates the template against the **first selected row** so you can verify output before executing.

### Quoting rules

```json
{
  "hostid": "${flds.hostid}",
  "tags": ${cols[3]}
}
```

- Wrap string fields in quotes in the template: `"${flds.hostid}"`
- Insert JSON already stored in a cell **without** extra quotes: `${cols[3]}` so a JSON array in the cell becomes a real array in the request

---

## Connection & query mode

Configure via the Zabbix logo (top right):

| Setting | On Zabbix frontend | Remote / local |
|---------|-------------------|----------------|
| API URL | `api_jsonrpc.php` | Full URL, e.g. `https://host/zabbix/api_jsonrpc.php` |
| Token | Bearer token from Zabbix UI | Same |
| API query mode | How Pull/Push fire many row requests | See below |

Credentials and mode are stored in localStorage. The connection test runs `host.get` with `{limit:1}`.

### Bulk query modes

| Mode | Behaviour | When to use |
|------|-----------|-------------|
| **sequential** (`seq`) | One request after another | Safest for writes and large selections |
| **parallel** | Many requests at once (browser-pooled) | Fast reads; riskier for heavy creates/updates |
| **hybrid** (`batch`) | Sequential batches of 10 parallel requests | Compromise between speed and load |

Start with **sequential** when testing Push templates on production.

---

## Pull — enrich rows from Zabbix

**Zabbix ops → Pull**

For each selected + visible row, ZbxWizz calls `{resource}.get` with your template and attaches the result to the row.

| Field | Description |
|-------|-------------|
| **Resource** | e.g. `host`, `item`, `trigger`, `hostinterface` |
| **Data label** | Key under `row.data` (default: `zbx`) |
| **Request editor** | JSON params template for `.get` |

### Example — items for each host

1. Import hosts with a `hostid` column
2. Select rows
3. Resource: `item` · Label: `items`
4. Template:

   ```json
   {
     "hostids": ["${flds.hostid}"],
     "output": ["itemid", "name", "key_"],
     "limit": 500
   }
   ```

5. Execute Pull

Each row gets `data.items`. Use it in transforms:

```javascript
data.items ? String(data.items.length) : "0"
```

```javascript
json(data.items)
```

Empty results surface as errors (“Not found”); failed rows log to the console and keep `lastError` / `lastResponse` for inspection (row number button).

---

## Push — write to Zabbix

**Zabbix ops → Push**

For each selected + visible row, ZbxWizz calls `{resource}.{operation}`.

| Field | Description |
|-------|-------------|
| **Resource** | `host`, `hostgroup`, `template`, `trigger`, … |
| **Operation** | `create`, `update`, or `delete` |
| **Request editor** | JSON params template |

| Operation | API method | Typical use |
|-----------|------------|-------------|
| `update` | `{resource}.update` | Modify existing objects |
| `create` | `{resource}.create` | Bulk create |
| `delete` | `{resource}.delete` | Bulk removal |

### Confirmation

Push always asks for confirmation. **Delete** shows an extra warning. There is **no undo**.

Successful rows are highlighted; errors use a different row colour. Inspect `lastError` / `lastResponse` via the row number button.

### Example — update host tags

```json
{
  "hostid": "${flds.hostid}",
  "tags": ${cols[4]}
}
```

### Example — create host groups from a name column

```json
{
  "name": "${flds.name}"
}
```

Resource: `hostgroup` · Operation: `create`

### Example — delete triggers

Resource: `trigger` · Operation: `delete`

```json
{
  "triggerid": "${flds.triggerid}"
}
```

---

## Error handling

- Template syntax errors show in the preview before you run
- Preview colour: green ≈ compiled OK, red ≈ invalid — still double-check content before Push
- Per-row API outcomes are stored on the row (`lastResponse`, `lastError`)
- An overlay spinner indicates batch operations in progress

---

## Safety checklist

Before pushing to production:

1. **Test on one or two rows** first
2. **Read the preview** after every template change
3. **Use filters** to narrow visible rows before Select All
4. Prefer **sequential** query mode for large writes
5. **Environment → Save** and/or **Export CSV** as backup
6. **Avoid delete** until update templates are proven
7. **Check token permissions** — the API enforces Zabbix role limits
8. Remember the import **default limit of 5** so you do not push incomplete selections by mistake

See [Getting started](getting-started.md) for a complete first push walkthrough.
