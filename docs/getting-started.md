# Getting started

This walkthrough takes you from a fresh install to updating host tags in Zabbix. It assumes ZbxWizz is [installed](installation.md) and that you have an API token ready.

Typical flow:

```text
  Import (Zabbix / CSV / Excel / JS)
            │
            ▼
  Edit sheet (filter · transform · pull)
            │
            ▼
  Export (CSV / Excel / charts)  or  Push to Zabbix
```

---

## 1. Connect to Zabbix

1. Click the **Zabbix logo** (top right)
2. Enter:
   - **API URL:** `api_jsonrpc.php` when served from the Zabbix frontend, or a full URL otherwise
   - **API Token:** from *Users → API tokens*
   - **API query mode:** start with **Sequential** for write tests
3. Click **Save config**

The logo turns bright red when the connection test (`host.get` with `limit: 1`) succeeds.

---

## 2. Import hosts

1. **Data → Import → From Zabbix**
2. **Resource:** `host`
3. In the request editor, paste:

   ```json
   {
     "limit": 5,
     "selectTags": ["tag", "value"]
   }
   ```

4. Run the import (Execute)

Five hosts appear in the table. Nested fields (like `tags`) are stored as JSON strings in the cells; the original object is also kept on the row as `data.csv` for transforms.

> **Safety default:** if you omit `limit` on a `.get` call, ZbxWizz injects `limit: 5` and may warn when the result hits that ceiling. Always set an explicit limit when you need more rows.

---

## 3. Transform a column

Add a tag to every **visible** host.

1. Open the **column index** menu on the tags column
2. Choose **Transform**
3. Enter:

   ```javascript
   json(obj(data.csv.tags).concat({"tag":"zbxwizz","value":"was here"}))
   ```

4. Check the live **preview**, then apply

The expression runs on each visible row in that column. Filtered-out rows are skipped.

---

## 4. Select rows to update

- Check individual row checkboxes, or
- Use the header checkbox to toggle all **visible** rows

Pull and Push only process rows that are **both selected and visible**.

The footer shows **Total**, **Selected**, and **Visible** counts.

---

## 5. Push back to Zabbix

1. **Zabbix → Push**
2. Configure:
   - **Resource:** `host`
   - **Operation:** `update`
3. In the request editor (adjust the tags column index if needed):

   ```json
   {
     "hostid": "${flds.hostid}",
     "tags": ${cols[1]}
   }
   ```

4. Check the **preview** — it should show valid JSON with `hostid` and `tags`
5. Confirm and execute

Verify the new tag in the Zabbix UI under *Data collection → Hosts*.

---

## What you learned

| Concept | Used here |
|---------|-----------|
| Import template | JSON params for `host.get` |
| Transform expression | JavaScript with `data.csv`, `obj()`, `json()` |
| Push template | JSON with `${flds.*}` and `${cols[N]}` |
| Row selection | Only selected + visible rows are pushed |

---

## Next steps

- [User interface](user-interface.md) — menus, sheets, filters, persistence
- [Zabbix operations](zabbix-operations.md) — Pull, Push, query modes, safety
- [Transformations](transformations.md) — full expression reference
- [Examples](examples.md) — import items, bulk rename, charts, host groups

---

## Spreadsheet alternative

If you prefer editing outside the app:

1. Import from Zabbix
2. **Data → Export → CSV** (or **Excel**)
3. Edit in Excel / LibreOffice
4. **Data → Import → CSV** (or **Excel**)
5. Push as above

Ensure the host ID column is named `hostid`, or change `${flds.hostid}` in the push template to match your column name.
