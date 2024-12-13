"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ConnectionStructure_1 = require("./ConnectionStructure");
const fs_1 = require("fs");
class LocalStorage {
    items;
    constructor() {
        if ((0, fs_1.existsSync)("localStorage.json")) {
            var txt = (0, fs_1.readFileSync)("localStorage.json", {
                encoding: "utf-8",
            });
            this.items = new Map(Object.entries(JSON.parse(txt)));
        }
        else {
            this.items = new Map();
        }
    }
    get length() {
        return this.items.size;
    }
    getItem(key) {
        return this.items.get(key);
    }
    async setItem(key, value) {
        this.items.set(key, value);
        this.writeItemsToLocalstorage();
    }
    async removeItem(key) {
        this.items.delete(key);
        this.writeItemsToLocalstorage();
    }
    key(index) {
        let ind = Number(index);
        let keys = this.items.keys();
        return this.items.get(Array.from(keys)[ind]);
    }
    clear() {
        this.items.clear();
        (0, fs_1.unlink)("localStorage.json", () => {
            console.log("localStorage file is removed");
        });
    }
    writeItemsToLocalstorage() {
        try {
            (0, fs_1.writeFileSync)("localStorage.json", JSON.stringify(this.items), {
                encoding: "utf-8",
            });
        }
        catch (e) {
            console.log("Error occurred during writing file");
        }
    }
    print() {
        console.log(this.items);
    }
}
class LocalStorageStructure extends ConnectionStructure_1.ConnectionStructure {
    constructor() {
        super(false, true);
    }
}
exports.default = LocalStorageStructure;
//# sourceMappingURL=LocalStorageStructure.js.map