import { ConnectionStructure } from "./ConnectionStructure";
import { writeFileSync, existsSync, readFileSync, unlink } from "fs";
class LocalStorage {
    items;
    constructor() {
        if (existsSync("localStorage.json")) {
            var txt = readFileSync("localStorage.json", {
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
        unlink("localStorage.json", () => {
            console.log("localStorage file is removed");
        });
    }
    writeItemsToLocalstorage() {
        try {
            writeFileSync("localStorage.json", JSON.stringify(this.items), {
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
export default class LocalStorageStructure extends ConnectionStructure {
    constructor() {
        super(false, true);
    }
}
//# sourceMappingURL=LocalStorageStructure.js.map