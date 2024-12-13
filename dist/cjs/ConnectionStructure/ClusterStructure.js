"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClusterStructure = void 0;
const cluster_1 = __importDefault(require("cluster"));
const utils_1 = require("../utils");
const ConnectionStructure_1 = require("./ConnectionStructure");
process.setMaxListeners(5000);
class ClusterStructure extends ConnectionStructure_1.ConnectionStructure {
    sendProcess;
    constructor({ isMaster } = { isMaster: true }) {
        super(false, isMaster);
        this.sendProcess = (message) => {
            if (isMaster) {
                return;
            }
            if (!process.send) {
                throw new Error("Impossible communication for change data!");
            }
            process.send(message);
        };
        this.on("tosend", this.sendProcess);
        this.connect();
    }
    mountMaster() {
        const listener = (worker, message, handle) => {
            if (!cluster_1.default.workers || typeof message.process_id !== "string" || message.process_id.trim() === "") {
                return;
            }
            const worker_process = cluster_1.default.workers[worker.id];
            this.receive(message)
                .then((m) => {
                if (m) {
                    this.emit("message", m);
                    this.send(m, (message) => {
                        if (!worker_process || !worker_process.send) {
                            throw new Error("Impossible communication for change data!");
                        }
                        worker_process.send(message);
                    });
                    if (m.type === utils_1.list_event_type.RETURN_EVENT_EMITTER) {
                        for (let worker_id in cluster_1.default.workers) {
                            if (Number(worker_id) !== worker.id) {
                                this.send(m, (message) => {
                                    const worker = cluster_1.default?.workers?.[Number(worker_id)];
                                    if (!worker || !worker.send) {
                                        throw new Error("Impossible communication for change data!");
                                    }
                                    worker.send(message);
                                });
                            }
                        }
                    }
                }
            })
                .catch((e) => {
                this.emit("error", e);
                this.send({
                    process_id: message.process_id,
                    key: message.key,
                    type: utils_1.list_event_type.RETURN_ERROR,
                    error: e,
                }, (message) => {
                    if (!worker_process || !worker_process.send) {
                        throw new Error("Impossible communication for change data!");
                    }
                    worker_process.send(message);
                });
            });
        };
        cluster_1.default.on("message", listener);
        this.on("close", () => {
            cluster_1.default.off("message", listener);
        });
        this.ready();
    }
    mountClient() {
        const listener = (message) => {
            if (typeof message.process_id !== "string" || message.process_id.trim() === "") {
                return;
            }
            this.receive(message)
                .then((m) => {
                if (m) {
                    if (m.type === utils_1.list_event_type.RETURN_EVENT_EMITTER) {
                        if (typeof m.key === "string")
                            this.emit("event", m.key, m.value);
                    }
                    else if (m.type !== utils_1.list_event_type.PIPE_IN_PROCESS) {
                        this.emit("message", m);
                    }
                    this.emit("log", m.type, m);
                }
            })
                .catch((e) => {
                this.emit("error", e);
            });
        };
        process.on("message", listener);
        this.on("close", () => {
            process.off("message", listener);
        });
        this.ready();
    }
    close() {
        this.off("tosend", this.sendProcess);
        super.close();
    }
}
exports.ClusterStructure = ClusterStructure;
//# sourceMappingURL=ClusterStructure.js.map