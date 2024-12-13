import EventEmitter from "events";
import PipeData from "../PipeData";
import Cache from "../Cache";
import { list_event_type, uuidv4 } from "../utils";
export class ConnectionStructure extends EventEmitter {
    isWebSocket = false;
    isMaster = true;
    pipe_data;
    cache = new Cache();
    _isReady = false;
    synchronizerTime;
    constructor(isWebSocket, isMaster) {
        super();
        this.pipe_data = new PipeData();
        this.isWebSocket = isWebSocket;
        this.isMaster = isMaster;
        this.setMaxListeners(5000);
    }
    connect() {
        if (this.isMaster) {
            this.mountMaster();
        }
        else {
            this.mountClient();
        }
        this.syncronizer();
    }
    get isReady() {
        return this._isReady;
    }
    syncronizer() {
        if (this.isMaster) {
            return;
        }
        clearInterval(this.synchronizerTime);
        this.synchronizerTime = setInterval(() => {
            if (this._isReady === false) {
                return;
            }
            clearInterval(this.synchronizerTime);
            const data = this.cache.toEntries();
            this.cache.clear();
            if (data.length <= 0) {
                return;
            }
            this.send({
                process_id: uuidv4(),
                type: list_event_type.SYNC_DATA,
                key: "sync_data",
                value: data,
            });
        }, 15000);
    }
    ready(isReady = true) {
        this._isReady = isReady;
        this.emit("ready");
        if (isReady)
            this.emit("connect");
        if (!isReady)
            this.emit("disconnect");
    }
    disconnect() {
        this.ready(false);
        this.emit("disconnect");
    }
    mountMaster() {
        throw new Error("Method not implemented.");
    }
    mountClient() {
        throw new Error("Method not implemented.");
    }
    send(message, send) {
        if ((this.isMaster && !send) || this._isReady === false) {
            return this.handler_data(message).then((message) => {
                this.emit("message", message);
                return Promise.resolve();
            });
        }
        return this.pipe_data.send(message, (message) => {
            if (send) {
                return send(message);
            }
            this.emit("tosend", message);
        });
    }
    receive(message, receive) {
        return new Promise((resolve, reject) => {
            this.pipe_data
                .receive(message, async (message) => {
                message = await this.handler_data(message);
                if (receive) {
                    return receive(message);
                }
                this.emit("toreceive", message);
            })
                .then(async (message) => {
                message = message !== undefined ? await this.handler_data(message) : undefined;
                resolve(message);
            })
                .catch(reject);
        });
    }
    forceResponse({ message, send, response, loopTime, duration, }) {
        return new Promise((resolve, reject) => {
            let timeLoop, time;
            const onMessage = (m) => {
                if (m.process_id !== message.process_id) {
                    return;
                }
                clearInterval(timeLoop);
                clearTimeout(time);
                this.off("message", onMessage);
                if (response) {
                    response(m);
                }
                resolve(m);
            };
            this.on("message", onMessage);
            const initial = () => {
                message.process_id = uuidv4();
                this.send(message, send);
            };
            timeLoop = setInterval(initial, loopTime ?? 4000);
            initial();
            const toReject = () => {
                clearInterval(timeLoop);
                clearTimeout(time);
                this.off("message", onMessage);
                reject(new Error(`Não foi possível obter uma resposta para: [${message.key}](${message.type} - ${message.process_id})`));
            };
            time = setTimeout(() => {
                clearTimeout(time);
                this.disconnect();
                time = setTimeout(() => {
                    toReject();
                }, duration ?? 10000);
            }, duration ?? 10000);
        });
    }
    handler_data(message) {
        return new Promise((resolve, reject) => {
            try {
                if (!this.isMaster || !this.cache) {
                    return resolve(message);
                }
                if ([list_event_type.SET_DATA, list_event_type.GET_DATA, list_event_type.DELETE_DATA, list_event_type.HAS_KEY, list_event_type.EVENT_EMITTER].includes(message.type) !== true) {
                    return resolve(message);
                }
                this.emit("log", message.type, message);
                switch (message.type) {
                    case list_event_type.SET_DATA:
                        this.cache.set(message.key, message.value, message.lifetime);
                        return resolve({
                            ...message,
                            type: list_event_type.RETURN_SET_DATA,
                        });
                    case list_event_type.GET_DATA:
                        return resolve({
                            ...message,
                            type: list_event_type.RETURN_GET_DATA,
                            key: message.key,
                            value: this.cache.get(message.key),
                        });
                    case list_event_type.DELETE_DATA:
                        this.cache.delete(message.key);
                        return resolve({
                            ...message,
                            type: list_event_type.RETURN_DELETE_DATA,
                        });
                    case list_event_type.HAS_KEY:
                        return resolve({
                            ...message,
                            type: list_event_type.RETURN_HAS_KEY,
                            key: message.key,
                            value: this.cache.has(message.key),
                        });
                    case list_event_type.EVENT_EMITTER:
                        if (typeof message.key === "string")
                            this.emit("event", message.key, message.value);
                        return resolve({
                            ...message,
                            type: list_event_type.RETURN_EVENT_EMITTER,
                        });
                    case list_event_type.SYNC_DATA:
                        const data = message.value;
                        this.cache.syncData(data);
                        return resolve({
                            ...message,
                            value: data.length,
                            type: list_event_type.RETURN_SYNC_DATA,
                        });
                }
            }
            catch (e) {
                this.emit("error", new Error(e));
                reject(e);
            }
        });
    }
    on(eventName, listener) {
        return super.on(eventName, listener);
    }
    off(eventName, listener) {
        return super.off(eventName, listener);
    }
    emit(eventName, ...args) {
        return super.emit(eventName, ...args);
    }
    close() {
        this.pipe_data.clear();
        this.cache.clear();
        this.ready(false);
        this.emit("destroy");
        this.emit("close");
        super.removeAllListeners();
    }
}
//# sourceMappingURL=ConnectionStructure.js.map