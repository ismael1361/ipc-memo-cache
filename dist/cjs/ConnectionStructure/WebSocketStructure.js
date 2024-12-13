"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketStructure = void 0;
const ConnectionStructure_1 = require("./ConnectionStructure");
const http_1 = require("http");
const ws_1 = __importStar(require("ws"));
const utils_1 = require("../utils");
class WebSocketStructure extends ConnectionStructure_1.ConnectionStructure {
    host;
    port;
    maxReconnectAttempts;
    sendProcess;
    eventSendProcess;
    constructor({ host = "localhost", port = 8080, isMaster = false, maxReconnectAttempts = 10 }) {
        super(true, isMaster);
        this.host = host;
        this.port = port;
        this.maxReconnectAttempts = maxReconnectAttempts;
        this.sendProcess = (message) => { };
        this.eventSendProcess = (message) => {
            this.sendProcess(message);
        };
        this.on("tosend", this.eventSendProcess);
        this.connect();
        this.on("disconnect", () => {
            this.connect();
        });
    }
    mountMaster() {
        const server = (0, http_1.createServer)();
        const wss = new ws_1.WebSocketServer({ server });
        const clients = new Map();
        wss.on("connection", (ws) => {
            const clientId = (0, utils_1.uuidv4)();
            clients.set(clientId, ws);
            this.ready();
            ws.on("message", (data) => {
                const message = JSON.parse(data);
                if (typeof message.process_id !== "string" || message.process_id.trim() === "") {
                    return;
                }
                this.receive(message)
                    .then((m) => {
                    if (m) {
                        this.emit("message", m);
                        this.send(m, (message) => {
                            ws.send(JSON.stringify(message));
                        });
                        if (m.type === utils_1.list_event_type.RETURN_EVENT_EMITTER) {
                            clients.forEach((ws, id) => {
                                if (id === clientId) {
                                    return;
                                }
                                this.send(m, (message) => {
                                    ws.send(JSON.stringify(message));
                                });
                            });
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
                        ws.send(JSON.stringify(message));
                    });
                });
            });
        });
        wss.on("close", () => {
            this.close();
        });
        server.listen(this.port, this.host);
        this.on("close", () => {
            wss.close();
            server.close();
        });
    }
    mountClient() {
        let ws, reconnectAttempts = 0, time, isStop = false;
        const reconnectInterval = 1000;
        const connect = () => {
            ws = new ws_1.default(`ws://${this.host}:${this.port}`);
            ws.on("open", () => {
                reconnectAttempts = 0;
                this.ready();
                this.sendProcess = (message) => {
                    ws.send(JSON.stringify(message));
                };
                ws.on("message", (data) => {
                    const message = JSON.parse(data);
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
                });
                ws.on("close", () => {
                    attemptReconnect();
                });
                ws.on("error", (error) => {
                    ws.close();
                });
            });
        };
        const attemptReconnect = () => {
            if (isStop) {
                return;
            }
            this.sendProcess = (message) => { };
            if (reconnectAttempts < this.maxReconnectAttempts) {
                reconnectAttempts++;
                const delay = reconnectInterval * reconnectAttempts;
                time = setTimeout(() => {
                    connect();
                }, delay);
            }
            else {
                clearTimeout(time);
                this.close();
            }
        };
        connect();
        this.on("close", () => {
            isStop = true;
            clearTimeout(time);
            ws.close();
        });
    }
    close() {
        this.off("tosend", this.eventSendProcess);
        super.close();
    }
}
exports.WebSocketStructure = WebSocketStructure;
//# sourceMappingURL=WebSocketStructure.js.map