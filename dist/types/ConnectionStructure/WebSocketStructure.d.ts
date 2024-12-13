import { ConnectionStructure } from "./ConnectionStructure";
export declare class WebSocketStructure extends ConnectionStructure {
    private host;
    private port;
    private maxReconnectAttempts;
    private sendProcess;
    private eventSendProcess;
    constructor({ host, port, isMaster, maxReconnectAttempts }: {
        host?: string;
        port?: number;
        isMaster?: boolean;
        maxReconnectAttempts?: number;
    });
    mountMaster(): void;
    mountClient(): void;
    close(): void;
}
//# sourceMappingURL=WebSocketStructure.d.ts.map