export default class LocalStorageManager {
    private _storage: Storage;

    constructor() {
        this._storage = window.localStorage;
    }

    get(key: string) {
        const value = this._storage.getItem(key);
        return value ? JSON.parse(value) : null;
    }

    set(key: string, value: any) {
        this._storage.setItem(key, JSON.stringify(value));
    }

    clear() {
        this._storage.clear();
    }
}