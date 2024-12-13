import { uuidv4, list_event_type } from "./utils";
export default class PipeData {
    pipe_data = new Map();
    events = new Map();
    timeVerify;
    cleaned = false;
    constructor() { }
    verifyDataInvalid() {
        clearTimeout(this.timeVerify);
        this.timeVerify = setTimeout(() => {
            this.pipe_data.forEach(({ time }, key) => {
                if (Date.now() - time > 1000 * 60 * 5) {
                    this.pipe_data.delete(key);
                }
            });
        }, 1000 * Math.round(Math.random() * 5));
    }
    clear() {
        this.pipe_data.clear();
        this.events.clear();
        this.cleaned = true;
    }
    onReceive(process_id, event, duration = 1000) {
        let time;
        const initial = () => {
            clearTimeout(time);
            time = setTimeout(() => {
                this.events.delete(process_id);
            }, duration);
            this.events.set(process_id, (message) => {
                clearTimeout(time);
                event(message);
                this.events.delete(message.process_id);
            });
        };
        initial();
        return {
            stop: () => {
                clearTimeout(time);
                this.events.delete(process_id);
            },
            restart: () => {
                if (this.events.has(process_id) !== true) {
                    return;
                }
                initial();
            },
        };
    }
    receive(data, receive) {
        if (this.cleaned) {
            return Promise.resolve(undefined);
        }
        this.verifyDataInvalid();
        return new Promise((resolve, reject) => {
            const processData = (message) => {
                if ([list_event_type.PIPE_IN_PROCESS].includes(message.type)) {
                    resolve(undefined);
                }
                else {
                    resolve(message);
                    receive?.(message);
                    if (this.events.has(message.process_id)) {
                        this.events.get(message.process_id)?.(message);
                    }
                }
            };
            if (data.totalChunks === 1) {
                return processData(JSON.parse(Buffer.from(data.chunk, "base64").toString("utf8")));
            }
            const key = data.process_id;
            const contains = this.pipe_data.has(key);
            const { data: value, time } = this.pipe_data.get(key) ?? {
                data: [],
                time: Date.now(),
            };
            if ((data.currentChunk === 0 && !contains) || (contains && data.currentChunk < data.totalChunks - 1)) {
                value[data.currentChunk] = data.chunk;
                this.pipe_data.set(key, { data: value, time: Date.now() });
            }
            else if (contains && data.currentChunk >= data.totalChunks - 1) {
                value[data.currentChunk] = data.chunk;
                const d = JSON.parse(Buffer.from(value.join(""), "base64").toString("utf8"));
                this.pipe_data.delete(key);
                return processData(d);
            }
            else {
                if (contains) {
                    this.pipe_data.delete(key);
                }
                return reject({
                    key: data.key,
                    process_id: data.process_id,
                    type: list_event_type.RETURN_ERROR,
                    error: "Error processing fragmented data!",
                });
            }
            return resolve(undefined);
        });
    }
    send(message, send, attempts = 0) {
        if (this.cleaned) {
            return Promise.resolve();
        }
        this.verifyDataInvalid();
        return new Promise(async (resolve, reject) => {
            try {
                const data = Buffer.from(JSON.stringify(message)).toString("base64");
                const chunkSize = 30 * 1024;
                const totalChunks = Math.ceil(data.length / chunkSize);
                for (let i = 0; i < totalChunks; i++) {
                    if (this.cleaned) {
                        break;
                    }
                    const start = i * chunkSize;
                    const end = start + chunkSize;
                    const chunk = data.slice(start, Math.min(end, data.length));
                    const d = {
                        key: message.key,
                        process_id: message.process_id,
                        chunk,
                        totalChunks,
                        currentChunk: i,
                        time: Date.now(),
                    };
                    send?.(d);
                }
            }
            catch (e) {
                return this.send({ ...message, process_id: uuidv4() }, send, attempts + 1)
                    .then(resolve)
                    .catch(reject);
            }
            return resolve();
        });
    }
}
//# sourceMappingURL=PipeData.js.map