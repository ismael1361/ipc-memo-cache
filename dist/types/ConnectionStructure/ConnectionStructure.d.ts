import EventEmitter from "events";
import { CacheMessage, PipeDataInfo } from "../types";
import Cache from "../Cache";
interface Events {
    ready: [];
    connect: [];
    disconnect: [];
    reconect: [];
    destroy: [];
    close: [];
    message: [CacheMessage];
    tosend: [PipeDataInfo];
    toreceive: [CacheMessage];
    error: [Error];
    event: [string, any];
    log: [string, CacheMessage];
}
export declare abstract class ConnectionStructure extends EventEmitter {
    readonly isWebSocket: boolean;
    readonly isMaster: boolean;
    private pipe_data;
    readonly cache: Cache;
    private _isReady;
    private synchronizerTime;
    constructor(isWebSocket: boolean, isMaster: boolean);
    connect(): void;
    get isReady(): boolean;
    syncronizer(): void;
    ready(isReady?: boolean): void;
    disconnect(): void;
    mountMaster(): void;
    mountClient(): void;
    send(message: CacheMessage, send?: (message: PipeDataInfo) => void): Promise<void>;
    receive(message: PipeDataInfo, receive?: (message: CacheMessage) => void): Promise<CacheMessage | undefined>;
    forceResponse({ message, send, response, loopTime, duration, }: {
        message: CacheMessage;
        send?: (message: PipeDataInfo) => void;
        response?: (message: CacheMessage) => void;
        loopTime?: number;
        duration?: number;
    }): Promise<CacheMessage>;
    private handler_data;
    on<e extends keyof Events>(eventName: e, listener: (...args: Events[e]) => void): this;
    off<e extends keyof Events>(eventName: e, listener: (...args: Events[e]) => void): this;
    emit<e extends keyof Events>(eventName: e, ...args: Events[e]): boolean;
    close(): void;
}
export {};
//# sourceMappingURL=ConnectionStructure.d.ts.map