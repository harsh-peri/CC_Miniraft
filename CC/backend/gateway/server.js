const WebSocket = require("ws");
const axios = require("axios");

const wss = new WebSocket.Server({ port: 5000 });

const REPLICAS = [
    "http://localhost:5001",
    "http://localhost:5002",
    "http://localhost:5003"
];

let clients = [];

// FIND LEADER
async function getLeader() {
    for (let r of REPLICAS) {
        try {
            const res = await axios.get(`${r}/status`);
            if (res.data.state === "leader") {
                return r;
            }
        } catch {}
    }
    return null;
}

// WS
wss.on("connection", (ws) => {
    clients.push(ws);

    ws.on("message", async (msg) => {
        const leader = await getLeader();

        if (!leader) return;

        try {
            const res = await axios.post(`${leader}/append-entries`, {
                entry: msg.toString()
            });

            if (res.data.committed) {
                clients.forEach(c => c.send(msg.toString()));
            }
        } catch {}
    });

    ws.on("close", () => {
        clients = clients.filter(c => c !== ws);
    });
});

console.log("Gateway running ws://localhost:5000");