import { ConnectionStructure } from "./ConnectionStructure";
import { writeFileSync, existsSync, readFileSync, unlink } from "fs";

class LocalStorage {
	private items: Map<string | number, any>;

	constructor() {
		if (existsSync("localStorage.json")) {
			var txt = readFileSync("localStorage.json", {
				encoding: "utf-8",
			});
			this.items = new Map(Object.entries(JSON.parse(txt)));
		} else {
			this.items = new Map();
		}
	}

	get length() {
		return this.items.size;
	}

	getItem(key: string | number) {
		return this.items.get(key);
	}

	async setItem(key: string | number, value: any) {
		this.items.set(key, value);
		this.writeItemsToLocalstorage();
	}

	async removeItem(key: string | number) {
		this.items.delete(key);
		this.writeItemsToLocalstorage();
	}

	key(index: number) {
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
		} catch (e) {
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
