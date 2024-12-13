import { ConnectionStructure } from "./ConnectionStructure";
export declare class ClusterStructure extends ConnectionStructure {
    private sendProcess;
    constructor({ isMaster }?: {
        isMaster: boolean;
    });
    mountMaster(): void;
    mountClient(): void;
    close(): void;
}
//# sourceMappingURL=ClusterStructure.d.ts.map