# User interface

ZbxWizz presents data as a multi-sheet workbook. Each sheet is an independent table with its own filters, transforms, and row data.

---

## Menu bar

| Menu | What it does |
|------|----------------|
| **File** | **New** workspace · **Save** / **Load** workbook `.json` |
| **Data → Import** | **CSV** · **Excel** · **From Zabbix** · **From JavaScript** |
| **Data → Export** | **CSV** · **Excel** · **Chart data** |
| **Table** | **Add rows** · **Reorder columns** |
| **Zabbix** | **Pull** (enrich rows) · **Push** (create / update / delete) |
| **Tools** | **Script editor** (ad-hoc JavaScript) |
| **Help** | In-app documentation · Zabbix API docs · Contact |
| **Zabbix logo / status** | API URL, token, and bulk query mode (**Connected** / **Not connected**) |

Footer: sheet tabs, **New sheet**, save icon, and **Total / Selected / Visible** counters.

An empty sheet also shows shortcut buttons for the four import paths (CSV, Excel, Zabbix, JavaScript).

---

## Table layout

Each column header has a **column index** button that opens a menu:

- **Filter** — empty / not empty / contains / does not contain / starts with / ends with / exact match · unique-value picker · Apply / Clear
- **Transform** — JavaScript expression editor (Ace) with preview
- **Format as date/time** — applies `formatUnix(self)` to visible cells (mutates stored values)
- **Sort** ascending / descending
- **Insert column** left / right · **Delete column** · **Resize column**

Also:

- Double-click a **field name** to rename the column
- Double-click a **cell** to edit (finish with **Ctrl+Enter** or click away)
- Click the **row number** for the row menu (see below)
- Row checkbox selects the row for Pull / Push; header checkbox toggles all **visible** rows
- Table hamburger (first header cell): **Add rows** · copy visible/selected to a new sheet · delete selected/unselected · **Clear errors**

Column numbers are **0-based**. Empty trailing columns may appear as `col0`, `col1`, …

Large sheets use **row virtualization** (only visible rows are rendered) so CSV/API imports with thousands of rows stay responsive.

---

## Row menu

Open from the row number button:

| Action | Behaviour |
|--------|-----------|
| **Row info** | JSON view of `flds`, `data`, `cols`, `lastResponse`, `lastError` |
| **Duplicate row** | Clone the row |
| **Delete row** | Remove the row |
| **Insert empty row before / after** | Insert a blank row next to this one |

---

## Table menu

**Table → Add rows** asks how many empty rows to append (same as the hamburger **Add rows** action).

**Table → Reorder columns** opens a sortable list of field names; Save rewrites the header and every row to the new order.

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

Filters matter for transforms and for “select all visible”: expressions and bulk select ignore hidden rows. Pull and Push also skip hidden rows even if they are selected.

**Clear errors** (table hamburger) clears per-row error highlighting / `lastError` state after failed API calls.

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

The footer **save** icon forces a flush of the IndexedDB autosave.

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

### File Save / Load

- **File → Save** exports the workbook (sheets + data) to a downloadable `.json` file. It does **not** include URL, token, or templates.
- **File → Load** replaces the workbook from that file and reloads the page.
- **File → New** clears the workbook (all sheets).

Before risky Push/Delete runs, save a workbook file and/or export CSV/Excel.

---

## Script editor

**Tools → Script editor** opens the **Script player**: an Ace JavaScript editor for ad-hoc automation against the current session.

| Control | Behaviour |
|---------|-----------|
| Editor | Ace with JS mode; draft restored from localStorage `script` |
| **Play** | Runs the body as an `async` function (`eval`); return value (or thrown error) appears in the debug area |
| Named scripts | Save / load scripts under `script_*` in localStorage |
| `dbg(text)` | Append a line to the debug textarea while the script runs |

Scripts can use the same session objects as transforms (`ws`, helpers such as `json` / `obj`, and anything else already in page scope). Prefer **column transforms** and **Pull/Push templates** for repeatable work; use the script editor for one-off exploration or multi-step glue.

---

## Responsibility banner

The empty workbook area shows a short responsibility reminder (“with great power…”). There is no separate accept gate — Push/Delete still require confirmation dialogs when you run them.
