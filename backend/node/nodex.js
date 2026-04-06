const express = require("express");
const axios = require("axios");
const fs = require("fs");

const app = express();
app.use(express.json());

const passedIDArg = parseInt(process.argv[2], 10);
const NODE_ID = "node" + passedIDArg;
const PORT = 5000;
const NODES = [
  "http://node1:5000",
  "http://node2:5000",
  "http://node3:5000"
];
const LOG_FILE = `/logs/${NODE_ID}.json`;

// ---------------- STATE ----------------
let state = "follower";
let currentTerm = 0;
let votedFor = null;
let leaderId = null;

let log = [];
let commitIndex = 0;

let electionTimeout;

// ---------------- TIMER ----------------
function resetElectionTimer() {
    clearTimeout(electionTimeout);
    electionTimeout = setTimeout(startElection, Math.random() * 1000 + 1500);
}

// ---------------- LOGGING ----------------
function loadLog() {
    try {
        const data = fs.readFileSync(LOG_FILE);
        const parsed = JSON.parse(data);

        log = parsed.entries || [];
        commitIndex = parsed.commitIndex || 0;
    } catch {
        log = [];
        commitIndex = 0;
    }
}

function saveLog() {
    fs.writeFileSync(LOG_FILE, JSON.stringify({
        entries: log,
        commitIndex
    }, null, 2));
}

// ---------------- ELECTION ----------------
async function startElection() {
    state = "candidate";
    currentTerm++;
    votedFor = NODE_ID;

    let votes = 1;

    for (let node of NODES) {
        if (node.includes(NODE_ID)) continue;

        try {
            const res = await axios.post(`${node}/request-vote`, {
                term: currentTerm,
                candidateId: NODE_ID
            });

            if (res.data.voteGranted) votes++;
        } catch (err) {
            console.error("Vote request failed:", err.message);
        }
    }

    // prevent race condition
    if (state !== "candidate") return;

    if (votes >= (Math.floor(NODES.length / 2) + 1)) {
        state = "leader";
	leaderId = NODE_ID;
        clearTimeout(electionTimeout); // stop elections
        console.log(`${NODE_ID} is LEADER (term ${currentTerm})`);
        return;
    }

    resetElectionTimer();
}

// ---------------- HEARTBEAT ----------------
setInterval(async () => {
    if (state === "leader") {
        for (let node of NODES) {
            if (node.includes(NODE_ID)) continue;

            try {
                await axios.post(`${node}/heartbeat`, {
                    term: currentTerm,
                    leaderId: NODE_ID
                });
            } catch (err) {
                console.error("Heartbeat failed:", err.message);
            }
        }
    }
}, 300);

// ---------------- APIs ----------------

// STATUS
app.get("/status", (req, res) => {
    res.json({ state, currentTerm, NODE_ID, log, commitIndex });
});

// GET FULL STATE (FOR NEW CLIENTS)
app.get("/state", (req, res) => {
    res.json({
        log,
        commitIndex
    });
});

// REQUEST VOTE
app.post("/request-vote", (req, res) => {
    const { term, candidateId } = req.body;

    // Reject stale terms
    if (term < currentTerm) {
        return res.json({ voteGranted: false });
    }

    // New term → reset
    if (term > currentTerm) {
        currentTerm = term;
        votedFor = null;
        state = "follower";
    }

    // Vote only once per term
    if (votedFor === null) {
        votedFor = candidateId;
        resetElectionTimer();
        return res.json({ voteGranted: true });
    }

    return res.json({ voteGranted: false });
});

// HEARTBEAT
app.post("/heartbeat", (req, res) => {
    const { term, leaderId: incomingLeader } = req.body;

    if (term >= currentTerm) {
        currentTerm = term;
        state = "follower";
        votedFor = null; // important
	leaderId = incomingLeader;
    }

    resetElectionTimer();
    res.sendStatus(200);
});

// APPEND ENTRIES (LEADER RECEIVES FROM GATEWAY)
app.post("/append-entries", async (req, res) => {
    if (state !== "leader") {
        return res.status(400).json({ error: "Not leader" });
    }

    const { entry } = req.body;

    log.push(entry);
    saveLog();

    let successCount = 1;

    for (let node of NODES) {
        if (node.includes(NODE_ID)) continue;

        try {
            const r = await axios.post(`${node}/append-entries-follower`, {
                entry,
                term: currentTerm
            });

            if (r.data.success) successCount++;
        } catch (err) {
            console.error("Replication failed:", err.message);
        }
    }

    if (successCount >= (Math.floor(NODES.length / 2) + 1)) {
        commitIndex++;
        saveLog();
        return res.json({ committed: true, entry });
    }

    res.json({ committed: false });
});

// FOLLOWER APPEND
app.post("/append-entries-follower", (req, res) => {
    const { entry, term } = req.body;

    if (term < currentTerm) {
        return res.json({ success: false });
    }

    if (term >= currentTerm) {
        currentTerm = term;
        state = "follower";
        votedFor = null;
    }

    log.push(entry);
    saveLog();

    res.json({ success: true });
});

// SYNC LOG (FOR RESTARTED NODE)
app.post("/sync-log", (req, res) => {
    const { fromIndex } = req.body;

    const missing = log.slice(fromIndex);

    res.json({ entries: missing, commitIndex });
});

setInterval(() => {
    if (state === "leader") {
        console.log(`${NODE_ID} is leader`);
    } else if (leaderId) {
        console.log(`${NODE_ID} is follower, ${leaderId} is leader`);
    } else {
        console.log(`${NODE_ID} is follower, leader unknown`);
    }
}, 1000);

// ---------------- START ----------------
app.listen(PORT, "0.0.0.0", () => {
    loadLog();
    console.log(`${NODE_ID} running on ${PORT}`);
    resetElectionTimer();
});
