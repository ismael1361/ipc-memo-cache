import EventEmitter from "events";
import Cache from "./Cache";
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
export declare class MemoCache extends EventEmitter {
    private isMaster;
    private isWebSocket;
    private structure;
    constructor();
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
    defineCluster(): void;
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
    defineSocketServer({ host, port, isMaster, maxReconnectAttempts }: {
        host?: string;
        port?: number;
        isMaster?: boolean;
        maxReconnectAttempts?: number;
    }): void;
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
    on<T = any>(event: string, callback: (value: T) => void): this;
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
    once<T = any>(event: string, callback: (value: T) => void): this;
    /**
     * Aciona um evento em todos os trabalhadores
     * @param eventName {string} - Nome do evento
     * @param value {T} - Valor do evento
     * @returns {boolean}
     * @example
     * memo.emit("event", "value");
     */
    emit<T = any>(eventName: string, value: T): boolean;
    /**
     * Aciona um evento em todos os trabalhadores uma única vez
     * @param eventName {string} - Nome do evento
     * @param value {T} - Valor do evento
     * @returns {boolean}
     * @example
     * memo.emitOnce("event", "value");
     */
    emitOnce<T = any>(eventName: string, value: T): boolean;
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
    off<T = any>(event: string, callback: (value: T) => void): this;
    /**
     * Acione um evento em todos os trabalhadores
     * @param key {string} - Nome do evento
     * @param value {any} - Valor do evento
     * @returns {Promise<void>}
     * @example
     * memo.trigger("event", "value");
     */
    trigger<T = any>(key: string, value: T): Promise<void>;
    /**
     * Acione um evento em todos os trabalhadores uma única vez
     * @param key {string} - Nome do evento
     * @param value {any} - Valor do evento
     * @returns {Promise<void>}
     * @example
     * memo.triggerOnce("event", "value");
     */
    triggerOnce<T = any>(key: string, value: T): Promise<void>;
    /**
     * Altera o valor de um determinado cache
     * @param key {string | number} - Chave do cache
     * @param value {any} - Valor do cache
     * @param lifetime {number} - Tempo de vida do cache em segundos
     * @returns {Promise<v|null>} - Retorna o valor do cache
     */
    set<v = any>(key: string | number, value: any, lifetime?: number | boolean): Promise<v | null>;
    /**
     * Remove um determinado cache
     * @param key {string | number} - Chave do cache
     * @returns {Promise<boolean>} - Retorna true se o cache foi removido com sucesso
     */
    delete(key: string | number): Promise<boolean>;
    /**
     * Retorna o valor de um determinado cache
     * @param key {string | number} - Chave do cache
     * @returns {Promise<v | null>} - Retorna o valor do cache
     */
    get<v = any>(key: string | number): Promise<v | null>;
    /**
     * Verifica se um determinado cache existe
     * @param key {string | number} - Chave do cache
     * @returns {Promise<boolean>} - Retorna true se o cache existe
     */
    has(key: string | number): Promise<boolean>;
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
    memoize<f = (...args: any[]) => Promise<any>>(fn: f, expireInSeconds?: number, specifyName?: string, specifyArgs?: number[] | undefined, timeout?: number): f;
    /**
     * Cria em cache um objeto do tipo Map
     * @param key {string} - Chave do cache
     * @returns Retorna propriedades e métodos para manipulação do Map
     * @example
     * const map = MemoCache.map("map");
     */
    map<K = string, V = any>(key: string): {
        /**
         * Retorna o valor de um determinado item do Map
         * @param key {K} - Chave do item
         * @returns {Promise<V | null>} - Retorna o valor do item
         * @example
         * await map.get("key");
         */
        get(key: K): Promise<V | null>;
        /**
         * Altera o valor de um determinado item do Map
         * @param key {K} - Chave do item
         * @param value {V} - Valor do item
         * @returns {Promise<V>} - Retorna o valor do item
         * @example
         * await map.set("key", "value");
         */
        set(key: K, value: V): Promise<V>;
        /**
         * Remove um determinado item do Map
         * @param key {K} - Chave do item
         * @returns {Promise<boolean>} - Retorna true se o item foi removido com sucesso
         * @example
         * await map.delete("key");
         */
        delete(key: K): Promise<boolean>;
        /**
         * Verifica se um determinado item do Map existe
         * @param key {K} - Chave do item
         * @returns {Promise<boolean>} - Retorna true se o item existe
         * @example
         * await map.has("key");
         */
        has(key: K): Promise<boolean>;
        /**
         * Retorna o tamanho do Map
         * @returns {Promise<number>} - Retorna o tamanho do Map
         * @example
         * await map.length();
         */
        length(): Promise<number>;
        /**
         * Rasteriza todos os itens do Map
         * @param callback {(value: V, key: K, index: number, length: number) => void | boolean | Promise<void | boolean>} - Função de callback
         * @returns {Promise<void>}
         * @example
         * await map.forEach((value, key, index, length) => {
         *  console.log(value, key, index, length);
         * });
         */
        forEach(callback: (value: V, key: K, index: number, length: number) => void | boolean | Promise<void | boolean>): Promise<void>;
    };
}
declare const memo: MemoCache;
export default memo;
//# sourceMappingURL=index.d.ts.map