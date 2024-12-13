import { CacheMessageKeyType, CacheMessageType, CacheMessageTypeResolve, CacheMessageTypeSend } from "../types";
export declare const uuidv4: () => string;
export declare const promiseState: (p: Promise<any>) => Promise<"pending" | "fulfilled" | "rejected">;
export declare const list_event_type: {
    [type in CacheMessageKeyType]: CacheMessageType;
};
export declare const list_event_return_type: {
    [type in CacheMessageTypeSend]: CacheMessageTypeResolve;
};
//# sourceMappingURL=index.d.ts.map