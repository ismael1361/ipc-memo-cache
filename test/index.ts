import cluster from "cluster";
import memo from "../src";

memo.defineCluster();

// if (cluster.isMaster) {
// 	for (let i = 0; i < 4; i++) {
// 		cluster.fork();
// 	}
// } else {
memo.on("event", async (value) => {
	console.log(`[Worker::${process.pid}] Evento recebida do master:`, value);
	console.log(`[Worker::${process.pid}] Tempo:`, await memo.get("time"));
});

setTimeout(async () => {
	if ((await memo.has("time")) === false) {
		await memo.set("time", new Date().toLocaleString());
	}

	console.log("Emitindo evento para todos os workers");
	memo.emit("event", "value");
}, 1000 * Math.round(Math.random() * 10));
// }
