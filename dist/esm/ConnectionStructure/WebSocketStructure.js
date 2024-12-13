import { ConnectionStructure } from "./ConnectionStructure";
import { createServer } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { list_event_type, uuidv4 } from "../utils";
export class WebSocketStructure extends ConnectionStructure {
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
        const server = createServer();
        const wss = new WebSocketServer({ server });
        const clients = new Map();
        wss.on("connection", (ws) => {
            const clientId = uuidv4();
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
                        if (m.type === list_event_type.RETURN_EVENT_EMITTER) {
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
                        type: list_event_type.RETURN_ERROR,
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
            ws = new WebSocket(`ws://${this.host}:${this.port}`);
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
                            if (m.type === list_event_type.RETURN_EVENT_EMITTER) {
                                if (typeof m.key === "string")
                                    this.emit("event", m.key, m.value);
                            }
                            else if (m.type !== list_event_type.PIPE_IN_PROCESS) {
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
//# sourceMappingURL=WebSocketStructure.js.map