import { CacheMessage, PipeDataInfo } from "./types";
export default class PipeData {
    private pipe_data;
    private events;
    private timeVerify;
    private cleaned;
    constructor();
    private verifyDataInvalid;
    clear(): void;
    onReceive(process_id: string, event: (message: CacheMessage) => void, duration?: number): {
        stop: () => void;
        restart: () => void;
    };
    receive(data: PipeDataInfo, receive?: (message: CacheMessage) => void): Promise<CacheMessage | undefined>;
    send(message: CacheMessage, send?: (message: PipeDataInfo) => void, attempts?: number): Promise<void>;
}
//# sourceMappingURL=PipeData.d.ts.map