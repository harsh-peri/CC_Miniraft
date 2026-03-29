const express = require('express');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 5000;

const FILE = path.join(__dirname, '../../logs/logs.json');

app.use(cors());
app.use(express.json());

if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify([]));
}

app.post('/logs', (req, res) => {
    try {
        const newLogs = req.body;

        if (!Array.isArray(newLogs)) {
            return res.status(400).json({ error: "Logs should be an array" });
        }

        const existing = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
        const updated = existing.concat(newLogs);

        fs.writeFileSync(FILE, JSON.stringify(updated, null, 2));

        res.json({ status: "saved", count: newLogs.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save logs" });
    }
});

app.get('/logs', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Read error" });
    }
});

app.listen(PORT, () => {
    console.log(`Gateway running on http://localhost:${PORT}`);
});