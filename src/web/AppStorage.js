/**
 * IndexedDB key/value store for sheet workbook data.
 * Small prefs (URL, token, templates) stay in localStorage.
 */
class AppStorage {
	static DB_NAME = "zbxwizz";
	static DB_VERSION = 1;
	static STORE = "kv";
	static MIGRATE_FLAG = "zbxwizz_idb_migrated";

	#db = null;
	ready;

	constructor() {
		this.ready = this.#open();
	}

	#open() {
		return new Promise((resolve, reject) => {
			const req = indexedDB.open(AppStorage.DB_NAME, AppStorage.DB_VERSION);
			req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
			req.onupgradeneeded = () => {
				const db = req.result;
				if (!db.objectStoreNames.contains(AppStorage.STORE)) {
					db.createObjectStore(AppStorage.STORE);
				}
			};
			req.onsuccess = () => {
				this.#db = req.result;
				resolve(this.#db);
			};
		});
	}

	#tx(mode) {
		return this.#db.transaction(AppStorage.STORE, mode).objectStore(AppStorage.STORE);
	}

	async get(key) {
		await this.ready;
		return new Promise((resolve, reject) => {
			const req = this.#tx("readonly").get(key);
			req.onsuccess = () => resolve(req.result === undefined ? null : req.result);
			req.onerror = () => reject(req.error);
		});
	}

	async set(key, value) {
		await this.ready;
		return new Promise((resolve, reject) => {
			const req = this.#tx("readwrite").put(value, key);
			req.onsuccess = () => resolve();
			req.onerror = () => {
				const err = req.error;
				log("AppStorage.set failed", key, err);
				if (err && (err.name === "QuotaExceededError" || err.code === 22)) {
					if (typeof alert_modal === "function") {
						alert_modal("Storage quota exceeded while saving sheet data. Free disk space or export/remove sheets.");
					}
				}
				reject(err);
			};
		});
	}

	async remove(key) {
		await this.ready;
		return new Promise((resolve, reject) => {
			const req = this.#tx("readwrite").delete(key);
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		});
	}

	async keys() {
		await this.ready;
		return new Promise((resolve, reject) => {
			const req = this.#tx("readonly").getAllKeys();
			req.onsuccess = () => resolve(req.result || []);
			req.onerror = () => reject(req.error);
		});
	}

	isSheetDataKey(key) {
		return key === "worksheets" || /^sheet-.+-data$/.test(key);
	}

	/**
	 * Remove all workbook keys from IndexedDB (and leftover localStorage sheet keys).
	 */
	async clearSheetKeys() {
		await this.ready;
		const all = await this.keys();
		await Promise.all(all.filter((k) => this.isSheetDataKey(k)).map((k) => this.remove(k)));
		Object.keys(localStorage)
			.filter((k) => this.isSheetDataKey(k))
			.forEach((k) => localStorage.removeItem(k));
	}

	#parseLocal(raw) {
		if (raw == null) return null;
		try {
			return typeof raw === "string" ? JSON.parse(raw) : raw;
		} catch (e) {
			return null;
		}
	}

	/**
	 * One-shot copy of worksheets + sheet-*-data from localStorage into IndexedDB.
	 */
	async migrateSheetsFromLocalStorage() {
		await this.ready;
		if (localStorage.getItem(AppStorage.MIGRATE_FLAG) === "1") {
			return false;
		}

		const toMigrate = Object.keys(localStorage).filter((k) => this.isSheetDataKey(k));
		if (!toMigrate.length) {
			localStorage.setItem(AppStorage.MIGRATE_FLAG, "1");
			return false;
		}

		for (const key of toMigrate) {
			const parsed = this.#parseLocal(localStorage.getItem(key));
			if (parsed != null) {
				await this.set(key, parsed);
			}
			localStorage.removeItem(key);
		}
		localStorage.setItem(AppStorage.MIGRATE_FLAG, "1");
		log("Migrated sheet data from localStorage to IndexedDB", toMigrate.length, "keys");
		return true;
	}
}

const appStorage = new AppStorage();
