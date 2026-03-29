const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT;
const NODE_ID = process.env.NODE_ID;
const PEERS = process.env.PEERS.split(",");

// ---------------- STATE ----------------
let state = "follower";
let currentTerm = 0;
let votedFor = null;

let log = [];
let commitIndex = 0;

let electionTimeout;

// ---------------- TIMER ----------------
function resetElectionTimer() {
    clearTimeout(electionTimeout);
    electionTimeout = setTimeout(startElection, Math.random() * 300 + 500);
}

// ---------------- ELECTION ----------------
async function startElection() {
    state = "candidate";
    currentTerm++;
    votedFor = NODE_ID;

    let votes = 1;

    for (let peer of PEERS) {
        try {
            const res = await axios.post(`${peer}/request-vote`, {
                term: currentTerm,
                candidateId: NODE_ID
            });

            if (res.data.voteGranted) votes++;
        } catch {}
    }

    if (votes >= 2) {
        state = "leader";
        console.log(`${NODE_ID} is LEADER (term ${currentTerm})`);
    }

    resetElectionTimer();
}

// ---------------- HEARTBEAT ----------------
setInterval(async () => {
    if (state === "leader") {
        for (let peer of PEERS) {
            try {
                await axios.post(`${peer}/heartbeat`, {
                    term: currentTerm,
                    leaderId: NODE_ID
                });
            } catch {}
        }
    }
}, 150);

// ---------------- APIs ----------------

// STATUS
app.get("/status", (req, res) => {
    res.json({ state, currentTerm, NODE_ID, log, commitIndex });
});

// REQUEST VOTE
app.post("/request-vote", (req, res) => {
    const { term, candidateId } = req.body;

    if (term > currentTerm) {
        currentTerm = term;
        votedFor = null;
        state = "follower";
    }

    if (!votedFor || votedFor === candidateId) {
        votedFor = candidateId;
        return res.json({ voteGranted: true });
    }

    res.json({ voteGranted: false });
});

// HEARTBEAT
app.post("/heartbeat", (req, res) => {
    const { term } = req.body;

    if (term >= currentTerm) {
        currentTerm = term;
        state = "follower";
        resetElectionTimer();
    }

    res.sendStatus(200);
});

// APPEND ENTRIES (LEADER RECEIVES FROM GATEWAY)
app.post("/append-entries", async (req, res) => {
    if (state !== "leader") {
        return res.status(400).json({ error: "Not leader" });
    }

    const { entry } = req.body;

    log.push(entry);

    let successCount = 1;

    for (let peer of PEERS) {
        try {
            const r = await axios.post(`${peer}/append-entries-follower`, {
                entry,
                term: currentTerm
            });

            if (r.data.success) successCount++;
        } catch {}
    }

    if (successCount >= 2) {
        commitIndex++;
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

    log.push(entry);
    res.json({ success: true });
});

// SYNC LOG (FOR RESTARTED NODE)
app.post("/sync-log", (req, res) => {
    const { fromIndex } = req.body;

    const missing = log.slice(fromIndex);

    res.json({ entries: missing, commitIndex });
});

// ---------------- START ----------------
app.listen(PORT, () => {
    console.log(`${NODE_ID} running on ${PORT}`);
    resetElectionTimer();
});