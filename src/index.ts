import cluster from "cluster";
import EventEmitter from "events";
import Cache from "./Cache";
import { uuidv4, promiseState, list_event_type } from "./utils";
import { CacheMessage } from "./types";
import { ClusterStructure, ConnectionStructure, WebSocketStructure } from "./ConnectionStructure";

export { Cache };

/**
 * @class MemoCache
 * @description Classe para criação de cache em memória
 * @example
 * const memo = new MemoCache();
 * memo.set("key", "value", 10);
 * memo.get("key").then(console.log); // value
 * memo.delete("key");
 * memo.has("key").then(console.log); // false
 * memo.memoize(async (a: number, b: number) => {
 *   return a + b;
 * }, 10, "sum", [0, 1]).then(console.log); // 3
 * memo.trigger("event", "value");
 * memo.on("event", console.log); // value
 */
export class MemoCache extends EventEmitter {
	private isMaster: boolean;
	private isWebSocket: boolean = false;
	private structure: ConnectionStructure;

	constructor() {
		super();
		this.isMaster = false;
		this.isWebSocket = false;

		this.structure = new ClusterStructure({ isMaster: true });
		this.defineCluster();
	}

	/**
	 * Define um cluster nativo do nodejs
	 * @returns {void}
	 * @example
	 * import cluster from "cluster";
	 * import os from "os";
	 * import memo from "ipc-memo-cache";
	 *
	 * memo.defineCluster();
	 *
	 * if (cluster.isMaster) {
	 *      for (let i = 0; i < os.cpus().length; i++) {
	 *          cluster.fork();
	 *      }
	 * } else {
	 *      memo.on("event", (value) => {
	 *          console.log(value);
	 *      });
	 *
	 *      memo.emit("event", "value");
	 * }
	 */
	defineCluster(): void {
		this.structure.close();

		this.isMaster = cluster.isPrimary;
		this.isWebSocket = false;
		this.structure = new ClusterStructure({ isMaster: cluster.isPrimary });

		this.structure.on("event", (key, value) => {
			if (/^once\[(.+)\]$/g.test(key)) {
				super.once(key.replace(/^once\[(.+)\]$/g, "$1"), value);
			} else {
				super.emit(key, value);
			}
		});
	}

	/**
	 * Define um servidor de socket
	 * @param host {string} - Host do servidor
	 * @param port {number} - Porta do servidor
	 * @param isMaster {boolean} - Se é o servidor principal
	 * @param maxReconnectAttempts {number} - Número máximo de tentativas de reconexão
	 * @returns {void}
	 * @example
	 * import memo from "ipc-memo-cache";
	 *
	 * memo.defineSocketServer({ host: "localhost", port: 8080, isMaster: false, maxReconnectAttempts: 10 });
	 *
	 * memo.on("event", (value) => {
	 *     console.log(value);
	 * });
	 *
	 * memo.emit("event", "value");
	 */
	defineSocketServer({ host = "localhost", port = 8080, isMaster = false, maxReconnectAttempts = 10 }: { host?: string; port?: number; isMaster?: boolean; maxReconnectAttempts?: number }): void {
		this.structure.close();

		this.isMaster = isMaster;
		this.isWebSocket = true;
		this.structure = new WebSocketStructure({ host, port, isMaster, maxReconnectAttempts });

		this.structure.on("event", (key, value) => {
			if (/^once\[(.+)\]$/g.test(key)) {
				super.once(key.replace(/^once\[(.+)\]$/g, "$1"), value);
			} else {
				super.emit(key, value);
			}
		});
	}

	/**
	 * Adiciona um evento
	 * @param event {string} - Nome do evento
	 * @param callback {(value: T) => void} - Função de callback
	 * @returns {this}
	 * @example
	 * memo.on("event", (value) => {
	 *      console.log(value);
	 * });
	 */
	on<T = any>(event: string, callback: (value: T) => void): this {
		return super.on(event, callback);
	}

	/**
	 * Adiciona um evento que será executado uma única vez
	 * @param event {string} - Nome do evento
	 * @param callback {(value: T) => void} - Função de callback
	 * @returns {this}
	 * @example
	 * memo.once("event", (value) => {
	 *      console.log(value);
	 * });
	 */
	once<T = any>(event: string, callback: (value: T) => void): this {
		return super.once(event, callback);
	}

	/**
	 * Aciona um evento em todos os trabalhadores
	 * @param eventName {string} - Nome do evento
	 * @param value {T} - Valor do evento
	 * @returns {boolean}
	 * @example
	 * memo.emit("event", "value");
	 */
	emit<T = any>(eventName: string, value: T): boolean {
		this.trigger(eventName, value);
		return true;
	}

	/**
	 * Aciona um evento em todos os trabalhadores uma única vez
	 * @param eventName {string} - Nome do evento
	 * @param value {T} - Valor do evento
	 * @returns {boolean}
	 * @example
	 * memo.emitOnce("event", "value");
	 */
	emitOnce<T = any>(eventName: string, value: T): boolean {
		this.triggerOnce(eventName, value);
		return true;
	}

	/**
	 * Remove um evento de um determinado callback
	 * @param event {string} - Nome do evento
	 * @param callback {(value: T) => void} - Função de callback
	 * @returns {this}
	 * @example
	 * memo.off("event", (value) => {
	 *     console.log(value);
	 * });
	 */
	off<T = any>(event: string, callback: (value: T) => void): this {
		return super.off(event, callback);
	}

	/**
	 * Acione um evento em todos os trabalhadores
	 * @param key {string} - Nome do evento
	 * @param value {any} - Valor do evento
	 * @returns {Promise<void>}
	 * @example
	 * memo.trigger("event", "value");
	 */
	trigger<T = any>(key: string, value: T): Promise<void> {
		return new Promise<void>(async (resolve) => {
			const process_id = uuidv4();

			const message: CacheMessage = {
				type: list_event_type.EVENT_EMITTER,
				key: key,
				value: value,
				process_id: process_id,
			};

			await this.structure.send(message);
			return resolve();
		});
	}

	/**
	 * Acione um evento em todos os trabalhadores uma única vez
	 * @param key {string} - Nome do evento
	 * @param value {any} - Valor do evento
	 * @returns {Promise<void>}
	 * @example
	 * memo.triggerOnce("event", "value");
	 */
	triggerOnce<T = any>(key: string, value: T): Promise<void> {
		return this.trigger(`once[${key}]`, value);
	}

	/**
	 * Altera o valor de um determinado cache
	 * @param key {string | number} - Chave do cache
	 * @param value {any} - Valor do cache
	 * @param lifetime {number} - Tempo de vida do cache em segundos
	 * @returns {Promise<v|null>} - Retorna o valor do cache
	 */
	set<v = any>(key: string | number, value: any, lifetime?: number | boolean): Promise<v | null> {
		return new Promise((resolve) => {
			const process_id = uuidv4();

			const message: CacheMessage = {
				type: list_event_type.SET_DATA,
				key: key,
				value: value,
				lifetime: lifetime,
				process_id: process_id,
			};

			this.structure
				.forceResponse({
					message,
				})
				.then((message) => {
					resolve(message?.value ?? null);
				})
				.catch((e) => {
					console.error(e);
					resolve(null);
				});
		});
	}

	/**
	 * Remove um determinado cache
	 * @param key {string | number} - Chave do cache
	 * @returns {Promise<boolean>} - Retorna true se o cache foi removido com sucesso
	 */
	delete(key: string | number): Promise<boolean> {
		return new Promise((resolve) => {
			const process_id = uuidv4();

			const message = {
				type: list_event_type.DELETE_DATA,
				key: key,
				process_id: process_id,
			};

			this.structure
				.forceResponse({
					message,
				})
				.then((message) => {
					resolve(message?.value ?? false);
				})
				.catch((e) => {
					console.error(e);
					resolve(false);
				});
		});
	}

	/**
	 * Retorna o valor de um determinado cache
	 * @param key {string | number} - Chave do cache
	 * @returns {Promise<v | null>} - Retorna o valor do cache
	 */
	get<v = any>(key: string | number): Promise<v | null> {
		return new Promise((resolve) => {
			const process_id = uuidv4();

			const message = {
				type: list_event_type.GET_DATA,
				key: key,
				process_id: process_id,
			};

			this.structure
				.forceResponse({
					message,
				})
				.then((message) => {
					resolve(message?.value ?? null);
				})
				.catch((e) => {
					console.error(e);
					resolve(null);
				});
		});
	}

	/**
	 * Verifica se um determinado cache existe
	 * @param key {string | number} - Chave do cache
	 * @returns {Promise<boolean>} - Retorna true se o cache existe
	 */
	has(key: string | number): Promise<boolean> {
		return new Promise((resolve) => {
			const process_id = uuidv4();

			const message = {
				type: list_event_type.HAS_KEY,
				key: key,
				process_id: process_id,
			};

			this.structure
				.forceResponse({
					message,
				})
				.then((message) => {
					resolve(message?.value ?? false);
				})
				.catch((e) => {
					console.error(e);
					resolve(false);
				});
		});
	}

	/**
	 * Cria um cache com um tempo de vida
	 * @param fn {(...args: any[]) => any} - Função que será executada
	 * @param expireInSeconds {number} - Tempo de vida do cache em segundos
	 * @param specifyName {string} - Nome do cache
	 * @param specifyArgs {number[]} - Argumentos que serão usados para diferenciar o memoize da mesma função, porêm com valores de argumentos diferentes
	 * @param timeout {number} - Tempo limite para a execução da função
	 * @returns {f} - Retorna a função com o cache
	 * @example
	 * const fn = MemoCache.memoize(async (a: number, b: number) => {
	 *    return a + b;
	 * }, 10, "sum", [0, 1]);
	 * fn(1, 2).then(console.log); // 3
	 */
	memoize<f = (...args: any[]) => Promise<any>>(fn: f, expireInSeconds?: number, specifyName?: string, specifyArgs: number[] | undefined = undefined, timeout: number = 60): f {
		const name: string = typeof specifyName === "string" && specifyName.trim() !== "" ? specifyName : Date.now().toString();
		let result: Promise<any> = Promise.resolve();

		return (async (...args: any[]) => {
			const argsNow: any[] = Array.isArray(specifyArgs) ? (args ?? []).filter((a, i) => (specifyArgs ?? []).indexOf(i)) : args ?? [];
			const key = `${name}__${argsNow.toString().replace(/\s/gi, "_")}`;
			const value = await this.get(key).catch(() => Promise.resolve(null));

			if (value !== null) {
				return Promise.resolve(value);
			}

			return await new Promise((resolve, reject) => {
				promiseState(result).then(async (state) => {
					if (state !== "pending") {
						const inProcess = await this.has(`_memoize_in_process_${key}`);

						if (inProcess) {
							const lastDate = Date.now();

							const time = setInterval(async () => {
								const value = await this.get(key).catch(() => Promise.resolve(null));

								if (value !== null) {
									clearInterval(time);
									resolve(value);
								} else if ((Date.now() - lastDate) / 1000 > timeout) {
									clearInterval(time);
									resolve(null);
								}
							}, 2000);

							return;
						}

						await this.set(`_memoize_in_process_${key}`, true, timeout);
						result = (fn as any).apply(null, args);
					}

					Promise.race([result])
						.then(async (result) => {
							await this.set(key, result, expireInSeconds);
							await this.delete(`_memoize_in_process_${key}`);
							resolve(result);
						})
						.catch((e) => {
							console.error(e);
							resolve(null);
						});
				});
			});
		}) as any;
	}

	/**
	 * Cria em cache um objeto do tipo Map
	 * @param key {string} - Chave do cache
	 * @returns Retorna propriedades e métodos para manipulação do Map
	 * @example
	 * const map = MemoCache.map("map");
	 */
	map<K = string, V = any>(key: string) {
		const self = this;
		const findIndexBy = async (k: K): Promise<number> => {
			const indexes = (await self.get<K[]>(`__map__${key}__indexes__`)) ?? [];
			return Promise.resolve(indexes.indexOf(k));
		};

		const pushBy = async (k: K): Promise<number> => {
			const indexes = (await self.get<K[]>(`__map__${key}__indexes__`)) ?? [];
			const index = indexes.indexOf(k) >= 0 ? indexes.indexOf(k) : indexes.length;
			indexes[index] = k;
			await self.set<K[]>(`__map__${key}__indexes__`, indexes);
			return index;
		};

		const deleteBy = async (k: K): Promise<boolean> => {
			const indexes = (await self.get<K[]>(`__map__${key}__indexes__`)) ?? [];
			const index = indexes.indexOf(k);
			await self.set<K[]>(
				`__map__${key}__indexes__`,
				indexes.filter((_, i) => i !== index),
			);
			return self.delete(`__map__${key}__item__${index}__`);
		};

		return {
			/**
			 * Retorna o valor de um determinado item do Map
			 * @param key {K} - Chave do item
			 * @returns {Promise<V | null>} - Retorna o valor do item
			 * @example
			 * await map.get("key");
			 */
			async get(key: K): Promise<V | null> {
				const index = await findIndexBy(key);
				return self.get<V>(`__map__${key}__item__${index}__`);
			},

			/**
			 * Altera o valor de um determinado item do Map
			 * @param key {K} - Chave do item
			 * @param value {V} - Valor do item
			 * @returns {Promise<V>} - Retorna o valor do item
			 * @example
			 * await map.set("key", "value");
			 */
			async set(key: K, value: V): Promise<V> {
				const index = await pushBy(key);
				await self.set<V>(`__map__${key}__item__${index}__`, value, false);
				return value;
			},

			/**
			 * Remove um determinado item do Map
			 * @param key {K} - Chave do item
			 * @returns {Promise<boolean>} - Retorna true se o item foi removido com sucesso
			 * @example
			 * await map.delete("key");
			 */
			async delete(key: K): Promise<boolean> {
				return deleteBy(key);
			},

			/**
			 * Verifica se um determinado item do Map existe
			 * @param key {K} - Chave do item
			 * @returns {Promise<boolean>} - Retorna true se o item existe
			 * @example
			 * await map.has("key");
			 */
			async has(key: K): Promise<boolean> {
				const index = await findIndexBy(key);
				return index >= 0;
			},

			/**
			 * Retorna o tamanho do Map
			 * @returns {Promise<number>} - Retorna o tamanho do Map
			 * @example
			 * await map.length();
			 */
			async length(): Promise<number> {
				const indexes = (await self.get<K[]>(`__map__${key}__indexes__`)) ?? [];
				return indexes.length;
			},

			/**
			 * Rasteriza todos os itens do Map
			 * @param callback {(value: V, key: K, index: number, length: number) => void | boolean | Promise<void | boolean>} - Função de callback
			 * @returns {Promise<void>}
			 * @example
			 * await map.forEach((value, key, index, length) => {
			 *  console.log(value, key, index, length);
			 * });
			 */
			async forEach(callback: (value: V, key: K, index: number, length: number) => void | boolean | Promise<void | boolean>): Promise<void> {
				const indexes = (await self.get<K[]>(`__map__${key}__indexes__`)) ?? [];
				for (let i = 0; i < indexes.length; i++) {
					const value = await self.get<V>(`__map__${key}__item__${i}__`);
					const resolved: boolean | void = await Promise.race([callback(value as V, indexes[i], i, indexes.length)]);
					if (resolved === true) {
						break;
					}
				}
			},
		};
	}
}

const memo = new MemoCache();
export default memo;
