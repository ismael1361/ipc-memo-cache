import { CacheMessage, PipeDataInfo } from "../types";
import cluster, { Worker } from "cluster";
import { list_event_type } from "../utils";

import { ConnectionStructure } from "./ConnectionStructure";

process.setMaxListeners(5000);

export class ClusterStructure extends ConnectionStructure {
	private sendProcess: (message: PipeDataInfo) => void;

	constructor({ isMaster }: { isMaster: boolean } = { isMaster: true }) {
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
		const listener = (worker: Worker, message: PipeDataInfo, handle: any): void => {
			if (!cluster.workers || typeof message.process_id !== "string" || message.process_id.trim() === "") {
				return;
			}

			const worker_process = cluster.workers[worker.id];

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

						if (m.type === list_event_type.RETURN_EVENT_EMITTER) {
							for (let worker_id in cluster.workers) {
								if (Number(worker_id) !== worker.id) {
									this.send(m, (message) => {
										const worker = cluster?.workers?.[Number(worker_id)];
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
					this.send(
						{
							process_id: message.process_id,
							key: message.key,
							type: list_event_type.RETURN_ERROR,
							error: e,
						} as CacheMessage,
						(message) => {
							if (!worker_process || !worker_process.send) {
								throw new Error("Impossible communication for change data!");
							}
							worker_process.send(message);
						},
					);
				});
		};

		cluster.on("message", listener);

		this.on("close", () => {
			cluster.off("message", listener);
		});

		this.ready();
	}

	mountClient() {
		const listener = (message: PipeDataInfo) => {
			if (typeof message.process_id !== "string" || message.process_id.trim() === "") {
				return;
			}
			this.receive(message)
				.then((m) => {
					if (m) {
						if (m.type === list_event_type.RETURN_EVENT_EMITTER) {
							if (typeof m.key === "string") this.emit("event", m.key as string, m.value);
						} else if (m.type !== list_event_type.PIPE_IN_PROCESS) {
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
