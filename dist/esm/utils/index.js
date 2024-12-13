export const uuidv4 = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        const randomSeed = Math.random() + Date.now(); // Combinando Date.now() com Math.random()
        const r = (randomSeed * 16) % 16 | 0, v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};
export const promiseState = (p) => {
    const t = { __timestamp__: Date.now() };
    return Promise.race([p, t]).then((v) => (v === t ? "pending" : "fulfilled"), () => "rejected");
};
export const list_event_type = {
    SET_DATA: "set_data",
    GET_DATA: "get_data",
    DELETE_DATA: "delete_data",
    HAS_KEY: "has_key",
    RETURN_SET_DATA: "return_set_data",
    RETURN_GET_DATA: "return_get_data",
    RETURN_DELETE_DATA: "return_delete_data",
    RETURN_HAS_KEY: "return_has_key",
    RETURN_ERROR: "return_error",
    PIPE_IN_PROCESS: "pipe_in_process",
    EVENT_EMITTER: "event_emitter",
    RETURN_EVENT_EMITTER: "return_event_emitter",
    SYNC_DATA: "sync_data",
    RETURN_SYNC_DATA: "return_sync_data",
};
export const list_event_return_type = {
    set_data: "return_set_data",
    get_data: "return_get_data",
    delete_data: "return_delete_data",
    has_key: "return_has_key",
    event_emitter: "return_event_emitter",
    sync_data: "return_sync_data",
};
//# sourceMappingURL=index.js.map