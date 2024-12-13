import { promiseState } from "./utils";

export default class Cache {
	private cache: Map<string | number, { value: any; time: number; expireTime: number }> = new Map();
	private defaultExpireInSeconds: number = 10;

	constructor() {}

	get length(): number {
		return this.cache.size;
	}

	clear() {
		this.cache.clear();
	}

	set(key: string | number, value: any, expireInSeconds?: number | boolean): void {
		expireInSeconds = (typeof expireInSeconds === "number" ? expireInSeconds : typeof expireInSeconds === "boolean" && expireInSeconds === false ? Infinity : this.defaultExpireInSeconds) * 1000;
		const time = Date.now();
		const expireTime = time + expireInSeconds;
		this.cache.set(key, { value, time, expireTime });
	}

	get<v = any>(key: string | number): v | null {
		const hasKey = this.has(key);
		const { value } = (hasKey ? this.cache.get(key) : undefined) ?? { value: null };
		return value;
	}

	has(key: string | number): boolean {
		if (this.cache.has(key)) {
			const entry = this.cache.get(key);
			if (entry && entry.expireTime >= Date.now()) {
				return true;
			}
			this.cache.delete(key);
		}
		return false;
	}

	delete(key: string | number): void {
		this.cache.delete(key);
	}

	memoize<f = (...args: any[]) => any>(fn: f, expireInSeconds?: number): f {
		const cache = this;
		const name: string = Date.now().toString();
		let result: Promise<any> = Promise.resolve();

		return function (...args: any[]) {
			return new Promise((resolve, reject) => {
				const key = `${name}__${(args ?? []).toString().replace(/\s/gi, "_")}`;
				const cachedValue = cache.get(key);
				if (cachedValue !== null) {
					return resolve(cachedValue);
				}
				promiseState(result).then((state) => {
					if (state !== "pending") {
						result = (fn as any).apply(null, args);
					}
					Promise.race([result])
						.then((result) => {
							cache.set(key, result, expireInSeconds);
							resolve(result);
						})
						.catch(reject);
				});
			});
		} as any;
	}

	toEntries(): [string | number, { value: any; time: number; expireTime: number }][] {
		return Array.from(this.cache);
	}

	fromEntries(entries: [string | number, { value: any; time: number; expireTime: number }][]): void {
		this.cache = new Map(entries);
	}

	syncData(entries: [string | number, { value: any; time: number; expireTime: number }][]): void {
		const now = Date.now();
		for (const [key, { value, time, expireTime }] of entries) {
			const before = this.get(key);
			if (this.has(key) && before.time > time && before.expireTime > now) {
				continue;
			}
			this.cache.set(key, { value, time, expireTime });
		}
	}

	toString(): string {
		return JSON.stringify(this.toEntries());
	}

	toJSON(): { [key: string]: any } {
		return Object.fromEntries(this.toEntries());
	}

	static fromJSON(json: { [key: string]: any }): Cache {
		const cache = new Cache();
		cache.fromEntries(Object.entries(json));
		return cache;
	}

	static fromString(str: string): Cache {
		return Cache.fromJSON(JSON.parse(str));
	}

	static fromEntries(entries: [string | number, { value: any; time: number; expireTime: number }][]): Cache {
		const cache = new Cache();
		cache.fromEntries(entries);
		return cache;
	}

	static fromObject(obj: { [key: string]: any }): Cache {
		return Cache.fromEntries(Object.entries(obj));
	}

	forEach(callback: (value: any, key: string | number) => boolean | void) {
		const time = Date.now();
		const data = this.toEntries();
		for (const [key, { value, expireTime }] of data) {
			if (expireTime < time) {
				this.cache.delete(key);
				continue;
			}
			const finished = callback(value, key) ?? false;
			if (finished) {
				break;
			}
		}
	}

	syncStorage(key: string, storage: Storage = localStorage): void {
		const data = storage.getItem(key);
		if (data) {
			this.fromEntries(JSON.parse(data));
		}
	}
}
