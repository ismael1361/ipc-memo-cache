"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
class Cache {
    cache = new Map();
    defaultExpireInSeconds = 10;
    constructor() { }
    get length() {
        return this.cache.size;
    }
    clear() {
        this.cache.clear();
    }
    set(key, value, expireInSeconds) {
        expireInSeconds = (typeof expireInSeconds === "number" ? expireInSeconds : typeof expireInSeconds === "boolean" && expireInSeconds === false ? Infinity : this.defaultExpireInSeconds) * 1000;
        const time = Date.now();
        const expireTime = time + expireInSeconds;
        this.cache.set(key, { value, time, expireTime });
    }
    get(key) {
        const hasKey = this.has(key);
        const { value } = (hasKey ? this.cache.get(key) : undefined) ?? { value: null };
        return value;
    }
    has(key) {
        if (this.cache.has(key)) {
            const entry = this.cache.get(key);
            if (entry && entry.expireTime >= Date.now()) {
                return true;
            }
            this.cache.delete(key);
        }
        return false;
    }
    delete(key) {
        this.cache.delete(key);
    }
    memoize(fn, expireInSeconds) {
        const cache = this;
        const name = Date.now().toString();
        let result = Promise.resolve();
        return function (...args) {
            return new Promise((resolve, reject) => {
                const key = `${name}__${(args ?? []).toString().replace(/\s/gi, "_")}`;
                const cachedValue = cache.get(key);
                if (cachedValue !== null) {
                    return resolve(cachedValue);
                }
                (0, utils_1.promiseState)(result).then((state) => {
                    if (state !== "pending") {
                        result = fn.apply(null, args);
                    }
                    Promise.race([result])
                        .then((result) => {
                        cache.set(key, result, expireInSeconds);
                        resolve(result);
                    })
                        .catch(reject);
                });
            });
        };
    }
    toEntries() {
        return Array.from(this.cache);
    }
    fromEntries(entries) {
        this.cache = new Map(entries);
    }
    syncData(entries) {
        const now = Date.now();
        for (const [key, { value, time, expireTime }] of entries) {
            const before = this.get(key);
            if (this.has(key) && before.time > time && before.expireTime > now) {
                continue;
            }
            this.cache.set(key, { value, time, expireTime });
        }
    }
    toString() {
        return JSON.stringify(this.toEntries());
    }
    toJSON() {
        return Object.fromEntries(this.toEntries());
    }
    static fromJSON(json) {
        const cache = new Cache();
        cache.fromEntries(Object.entries(json));
        return cache;
    }
    static fromString(str) {
        return Cache.fromJSON(JSON.parse(str));
    }
    static fromEntries(entries) {
        const cache = new Cache();
        cache.fromEntries(entries);
        return cache;
    }
    static fromObject(obj) {
        return Cache.fromEntries(Object.entries(obj));
    }
    forEach(callback) {
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
    syncStorage(key, storage = localStorage) {
        const data = storage.getItem(key);
        if (data) {
            this.fromEntries(JSON.parse(data));
        }
    }
}
exports.default = Cache;
//# sourceMappingURL=Cache.js.map