import EventEmitter from "events";
import PipeData from "../PipeData";
import { CacheMessage, PipeDataInfo } from "../types";
import Cache from "../Cache";
import { list_event_type, uuidv4 } from "../utils";

interface Events {
	ready: [];
	connect: [];
	disconnect: [];
	reconect: [];
	destroy: [];
	close: [];
	message: [CacheMessage];
	tosend: [PipeDataInfo];
	toreceive: [CacheMessage];
	error: [Error];
	event: [string, any];
	log: [string, CacheMessage];
}

export abstract class ConnectionStructure extends EventEmitter {
	readonly isWebSocket: boolean = false;
	readonly isMaster: boolean = true;
	private pipe_data: PipeData;
	readonly cache: Cache = new Cache();
	private _isReady: boolean = false;
	private synchronizerTime: NodeJS.Timeout | undefined;

	constructor(isWebSocket: boolean, isMaster: boolean) {
		super();
		this.pipe_data = new PipeData();
		this.isWebSocket = isWebSocket;
		this.isMaster = isMaster;
		this.setMaxListeners(5000);
	}

	connect() {
		if (this.isMaster) {
			this.mountMaster();
		} else {
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

	ready(isReady: boolean = true) {
		this._isReady = isReady;
		this.emit("ready");
		if (isReady) this.emit("connect");
		if (!isReady) this.emit("disconnect");
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

	send(message: CacheMessage, send?: (message: PipeDataInfo) => void) {
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

	receive(message: PipeDataInfo, receive?: (message: CacheMessage) => void): Promise<CacheMessage | undefined> {
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

	forceResponse({
		message,
		send,
		response,
		loopTime,
		duration,
	}: {
		message: CacheMessage;
		send?: (message: PipeDataInfo) => void;
		response?: (message: CacheMessage) => void;
		loopTime?: number;
		duration?: number;
	}): Promise<CacheMessage> {
		return new Promise((resolve, reject) => {
			let timeLoop: NodeJS.Timeout, time: NodeJS.Timeout;

			const onMessage = (m: CacheMessage) => {
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

	private handler_data(message: CacheMessage): Promise<CacheMessage> {
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
						if (typeof message.key === "string") this.emit("event", message.key, message.value);
						return resolve({
							...message,
							type: list_event_type.RETURN_EVENT_EMITTER,
						});
					case list_event_type.SYNC_DATA:
						const data = message.value as [string, any][];
						this.cache.syncData(data);
						return resolve({
							...message,
							value: data.length,
							type: list_event_type.RETURN_SYNC_DATA,
						});
				}
			} catch (e) {
				this.emit("error", new Error(e as any));
				reject(e);
			}
		});
	}

	on<e extends keyof Events>(eventName: e, listener: (...args: Events[e]) => void): this {
		return super.on(eventName, listener as any);
	}

	off<e extends keyof Events>(eventName: e, listener: (...args: Events[e]) => void): this {
		return super.off(eventName, listener as any);
	}

	emit<e extends keyof Events>(eventName: e, ...args: Events[e]): boolean {
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
