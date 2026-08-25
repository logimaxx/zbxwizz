# User interface

ZbxWizz presents data as a multi-sheet workbook. Each sheet is an independent table with its own filters, transforms, and row data.

---

## Menu bar

| Menu | What it does |
|------|----------------|
| **Environment** | **New** workspace · **Save** / **Load** workbook `.json` |
| **Data** | Import CSV / XLS / Zabbix / JavaScript · Export CSV / XLS · Chart data |
| **Table ops** | Add rows · Reorder columns |
| **Zabbix ops** | **Pull** (enrich rows) · **Push** (create / update / delete) |
| **Tools** | Script editor (advanced JavaScript) |
| **Help** | In-app documentation · Zabbix API docs · Contact |
| **Zabbix logo** | API URL, token, and bulk query mode |

Footer: sheet tabs, **New sheet**, save icon, and **Total / Selected / Visible** counters.

---

## Table layout

Each column header has a **column index** button that opens a menu:

- **Filter** — empty / not empty / contains / does not contain / starts with / ends with / exact match
- **Transform** — JavaScript expression editor (Ace) with preview
- **Format as date/time** — applies `formatUnix(self)` to visible cells (mutates stored values)
- **Sort** ascending / descending
- Insert / delete column, resize

Also:

- Double-click a **field name** to rename the column
- Double-click a **cell** to edit (finish with Ctrl+Enter or click away)
- Click the **row number** to inspect the full row object (`data`, `lastResponse`, `lastError`, …)
- Row checkbox selects the row for Pull / Push
- Table hamburger (first header cell): copy visible/selected rows to a new sheet; delete selected/unselected

Column numbers are **0-based**. Empty trailing columns may appear as `col0`, `col1`, …

---

## Filtering

Filters are applied from the column menu. The term is inserted into a **regular expression** pattern (case-insensitive). Escape special characters (`.`, `*`, `(`, …) with a backslash when you mean them literally.

| Preset | Behaviour |
|--------|-----------|
| Empty / Not empty | Match blank or non-blank cells |
| Contains / Does not contain | Substring (regex) |
| Starts with / Ends with / Exact match | Anchored match |

The value dropdown lists unique values from that column for quick picks.

**Multiple column filters combine with AND** — a row must pass every active filter to stay visible.

Filters matter for transforms and for “select all visible”: expressions and bulk select ignore hidden rows.

---

## Sheets

- **Click** a tab to switch sheets
- **Tab menu** (caret on the tab, or right-click): **Rename**, **Duplicate**, **Delete**
- **[+]** New sheet
- Tabs can be **drag-reordered**

Each sheet has its own data and filters. Cross-sheet lookups in transforms use `ws.sheetName` (see [Transformations](transformations.md)).

From the table hamburger you can **copy visible** or **copy selected** rows into a new sheet. **Duplicate** on the tab menu clones the whole sheet (all rows and columns).

---

## Footer statistics

| Badge | Meaning |
|-------|---------|
| **Total** | All rows in the active sheet |
| **Selected** | Rows with checkbox checked |
| **Visible** | Rows not hidden by filters |

Pull and Push run only on rows that are **selected and visible**.

---

## Persistence

### IndexedDB (workbook)

Sheet list and row data are stored in the browser **IndexedDB** database `zbxwizz` (keys like `worksheets` and `sheet-{name}-data`). This avoids the ~5MB localStorage limit for large workbooks.

Autosave is debounced after edits; the footer save icon forces a flush. Closing or hiding the tab also flushes pending saves.

Older installs migrate sheet keys from localStorage once.

### localStorage (prefs)

Still used for:

| Data | Keys (patterns) |
|------|-----------------|
| API URL / token / query mode | `zbxUrl`, `zbxToken`, `zbxBulkQueryMode` |
| Request templates | `importReqTpl_*`, `pullReqTpl_*`, `pushReqTpl_*`, … |
| Saved transforms | `transfo_*` |
| Script editor drafts | `script`, `script_*` |

### Environment Save / Load

- **Environment → Save** exports the workbook (sheets + data) to a downloadable `.json` file. It does **not** include URL, token, or templates.
- **Environment → Load** replaces the workbook from that file and reloads the page.

Before risky Push/Delete runs, save an environment file and/or export CSV.

---

## Script editor

**Tools → Script editor** opens an Ace JavaScript editor for ad-hoc automation against the current session. Results appear in the debug area. Named scripts can be saved in localStorage.

This is an advanced escape hatch — prefer column transforms and Pull/Push templates for repeatable work.

---

## Startup disclaimer

First-time visitors see a warning about Push/Delete. Accepting remembers the choice in localStorage.
