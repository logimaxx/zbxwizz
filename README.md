# ZbxWizz

**ZbxWizz** is a client-side web app for managing Zabbix configuration at scale. Import, transform, chart, export, and push data through a spreadsheet-like UI — create, update, and delete resources via the Zabbix API without writing one-off scripts for every change.

## Key features

- **Spreadsheet workbook** — multiple sheets, sorting, filtering, inline edits, column transforms
- **JavaScript transforms** — column expressions with `flds` / `cols`, cross-sheet `lookup`, helpers like `json`, `obj`, `formatUnix`
- **Import** — Zabbix API, CSV, XLS/XLSX, or a JavaScript script that returns rows
- **Export & charts** — CSV (all / selected / visible) and Chart.js frequency / time histograms
- **Zabbix ops** — Pull (enrich rows) and Push (create / update / delete) with request templates
- **Script editor** — ad-hoc automation against the current session
- **Persistence** — sheet data in IndexedDB; connection and templates in localStorage; Environment Save/Load for portable workbooks

## Security

Everything runs in your browser. Workbook data and tokens stay on your machine; the only network calls are the ones you trigger to your Zabbix API.

## Quick start

```bash
git clone https://github.com/logimaxx/zbxwizz.git
cd zbxwizz
npm install
python3 -m http.server 8080
```

Open `http://localhost:8080/src/web/`, click the Zabbix logo, set API URL and token.

For production, serve the app from the same host as the Zabbix UI (same-origin, relative `api_jsonrpc.php`). See [Installation](docs/installation.md).

## Documentation

- **Website:** [https://zbxwizz.app/docs/](https://zbxwizz.app/docs/)
- **In-repo guides:** [docs/](docs/) (Getting started, Installation, UI, Import/export, Zabbix ops, Transformations, Examples)
- **In-app:** Help → ZbxWizz documentation

## License

[MIT](LICENSE.md)

## Contributing

Pull requests are welcome. For larger changes, open an issue first. Please update docs when behaviour changes.

## Contact

[support@zbxwizz.app](mailto:support@zbxwizz.app)
