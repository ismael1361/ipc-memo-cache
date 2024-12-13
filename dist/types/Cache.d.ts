export default class Cache {
    private cache;
    private defaultExpireInSeconds;
    constructor();
    get length(): number;
    clear(): void;
    set(key: string | number, value: any, expireInSeconds?: number | boolean): void;
    get<v = any>(key: string | number): v | null;
    has(key: string | number): boolean;
    delete(key: string | number): void;
    memoize<f = (...args: any[]) => any>(fn: f, expireInSeconds?: number): f;
    toEntries(): [string | number, {
        value: any;
        time: number;
        expireTime: number;
    }][];
    fromEntries(entries: [string | number, {
        value: any;
        time: number;
        expireTime: number;
    }][]): void;
    syncData(entries: [string | number, {
        value: any;
        time: number;
        expireTime: number;
    }][]): void;
    toString(): string;
    toJSON(): {
        [key: string]: any;
    };
    static fromJSON(json: {
        [key: string]: any;
    }): Cache;
    static fromString(str: string): Cache;
    static fromEntries(entries: [string | number, {
        value: any;
        time: number;
        expireTime: number;
    }][]): Cache;
    static fromObject(obj: {
        [key: string]: any;
    }): Cache;
    forEach(callback: (value: any, key: string | number) => boolean | void): void;
    syncStorage(key: string, storage?: Storage): void;
}
//# sourceMappingURL=Cache.d.ts.map