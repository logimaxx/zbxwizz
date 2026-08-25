# Installation

ZbxWizz is a **client-side web app**. There is no application backend and no database on the server. The browser talks to the Zabbix JSON-RPC API with your token; workbook data stays in the browser (IndexedDB / localStorage).

You need:

- A checkout of this repository
- Node.js / npm once, to install front-end dependencies (`npm install`)
- A way to serve the files over HTTP (do not open `file://` for API work)

---

## Option 1 — On the Zabbix frontend (recommended)

Serving ZbxWizz from the same web root as the Zabbix UI is the best production setup:

- API calls are **same-origin** — no CORS workarounds
- You can use a **relative API URL** such as `api_jsonrpc.php`
- Your team can bookmark it like any other internal tool

### Steps

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/logimaxx/zbxwizz.git
   cd zbxwizz
   npm install
   ```

2. Copy the app into your Zabbix web root **preserving the folder layout** (`src/web` must stay two levels above `node_modules`, and `docs/` next to `src/` for in-app Help):

   ```bash
   sudo mkdir -p /usr/share/zabbix/zbxwizz
   sudo cp -a src docs node_modules index.html /usr/share/zabbix/zbxwizz/
   ```

   Adjust the destination to match your install:

   | Platform | Typical web root |
   |----------|------------------|
   | RHEL / Alma / Rocky (package) | `/usr/share/zabbix/` |
   | Debian / Ubuntu (package) | `/usr/share/zabbix/` |
   | Manual install / Docker | wherever the Zabbix UI is served from |

3. Open in the browser:

   ```
   https://your-zabbix-server/zbxwizz/src/web/
   ```

   (The repo root `index.html` only redirects to `src/web/`.)

4. Configure the API connection (Zabbix logo, top right):

   | Field | Value |
   |-------|-------|
   | API URL | `api_jsonrpc.php` (same host as the UI) |
   | Token | from *Users → API tokens* in Zabbix |
   | API query mode | `sequential` for safety, `hybrid` for balance, `parallel` for speed |

   When the connection test succeeds (`host.get` with `limit: 1`), the logo turns from pale red to bright red.

### Optional preset file

If `zbxUrl` is not already in localStorage, the app tries to load `preset_env.json` next to the page (or from the site root, depending on how you serve files). Example shape:

```json
{
  "zbxUrl": "api_jsonrpc.php",
  "zbxToken": "YOUR_TOKEN",
  "zbxBulkQueryMode": "seq"
}
```

Do **not** commit real tokens. Prefer entering the token in the UI so it stays in the browser’s localStorage only.

### Upgrading

Replace the copied files with the new version, then run `npm install` again if dependencies changed. Before upgrading, export your workbook if you rely on saved sheet data:

- **Environment → Save** downloads sheets to a `.json` file
- Connection settings, request templates, and saved transforms live in **localStorage** — they are not included in the environment file

---

## Option 2 — Local try-out

Useful for evaluation or offline table work.

```bash
git clone https://github.com/logimaxx/zbxwizz.git
cd zbxwizz
npm install
python3 -m http.server 8080
```

Open `http://localhost:8080/src/web/`.

### Limitations when not on the Zabbix frontend

| Issue | Workaround |
|-------|------------|
| Cross-origin API calls | Prefer Option 1, or configure CORS on the Zabbix web server / use a reverse proxy |
| Opening `file://` directly | Avoid — use a local HTTP server |
| Full absolute API URL | Works if the browser can reach it and CORS allows it |

For day-to-day use against a live Zabbix instance, prefer **Option 1**.

---

## First launch

On first visit you see a responsibility disclaimer. Accept it to enter the app. The choice is remembered in localStorage.

---

## Troubleshooting

**Zabbix icon stays pale red**

- Check API URL and token
- Open browser developer tools → Network → look for failed `api_jsonrpc.php` (or your URL) requests
- Verify the token user has permission for the operations you intend to run
- Confirm you are on HTTPS/HTTP consistently with the Zabbix UI

**Missing CSS / icons / blank page assets**

- Confirm `node_modules` was copied and `npm install` succeeded
- Paths are relative: from `src/web/` the app loads `../../node_modules/...`

**404 when opening `/zbxwizz/`**

- Use `/zbxwizz/src/web/` (or add your own redirect)
- Confirm files sit under the correct web root and URL prefix (e.g. `/zabbix/zbxwizz/src/web/` if Zabbix is in a subdirectory)

**Import returns only 5 rows**

- Unbounded `*.get` calls default to `limit: 5` for safety. Set an explicit `limit` in the import request (see [Import & export](import-export.md)).
