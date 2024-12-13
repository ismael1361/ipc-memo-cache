export type CacheMessageKeyTypeSend = "SET_DATA" | "GET_DATA" | "DELETE_DATA" | "HAS_KEY" | "EVENT_EMITTER" | "SYNC_DATA";
export type CacheMessageKeyTypeResolve = "RETURN_SET_DATA" | "RETURN_GET_DATA" | "RETURN_DELETE_DATA" | "RETURN_HAS_KEY" | "RETURN_ERROR" | "RETURN_EVENT_EMITTER" | "RETURN_SYNC_DATA";
export type CacheMessageKeyType = CacheMessageKeyTypeSend | CacheMessageKeyTypeResolve | "PIPE_IN_PROCESS";
export type CacheMessageTypeSend = "set_data" | "get_data" | "delete_data" | "has_key" | "event_emitter" | "sync_data";
export type CacheMessageTypeResolve = "return_set_data" | "return_get_data" | "return_delete_data" | "return_has_key" | "return_error" | "return_event_emitter" | "return_sync_data";
export type CacheMessageType = CacheMessageTypeSend | CacheMessageTypeResolve | "pipe_in_process";
export interface CacheMessage {
    type: CacheMessageType;
    key: string | number;
    value?: any;
    lifetime?: number | boolean;
    process_id: string;
    error?: any;
}
export interface PipeDataInfo {
    key: string | number;
    process_id: string;
    chunk: string;
    totalChunks: number;
    currentChunk: number;
    time: number;
}
//# sourceMappingURL=index.d.ts.map