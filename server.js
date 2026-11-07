const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'counters.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Ensure data folder and file exist
function initStorage() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      counters: [
        {
          id: 'default',
          name: 'Primary Counter',
          value: 0,
          target: 100,
          totalClicks: 0,
          peakValue: 0,
          sessionDelta: 0,
          history: []
        }
      ],
      activeCounterId: 'default',
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

// Read database
function readData() {
  initStorage();
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading data file:', err);
    return { counters: [], activeCounterId: null };
  }
}

// Write database
function writeData(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing data file:', err);
    return false;
  }
}

// ==========================================
// REST API ROUTES
// ==========================================

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// GET all counters & active ID
app.get('/api/counters', (req, res) => {
  const data = readData();
  res.json(data);
});

// CREATE a new counter
app.post('/api/counters', (req, res) => {
  const data = readData();
  const name = req.body.name || `Counter ${data.counters.length + 1}`;
  const target = Number(req.body.target) || 100;

  const newCounter = {
    id: 'counter_' + Date.now(),
    name,
    value: 0,
    target,
    totalClicks: 0,
    peakValue: 0,
    sessionDelta: 0,
    history: []
  };

  data.counters.push(newCounter);
  data.activeCounterId = newCounter.id;
  writeData(data);

  res.status(201).json(newCounter);
});

// UPDATE active counter selection
app.post('/api/counters/active', (req, res) => {
  const { id } = req.body;
  const data = readData();
  const exists = data.counters.some(c => c.id === id);

  if (!exists) {
    return res.status(404).json({ error: 'Counter not found' });
  }

  data.activeCounterId = id;
  writeData(data);
  res.json({ success: true, activeCounterId: id });
});

// UPDATE counter (rename, target, value)
app.put('/api/counters/:id', (req, res) => {
  const { id } = req.params;
  const { name, target, value } = req.body;
  const data = readData();

  const counter = data.counters.find(c => c.id === id);
  if (!counter) {
    return res.status(404).json({ error: 'Counter not found' });
  }

  if (name !== undefined) counter.name = String(name).trim() || counter.name;
  if (target !== undefined && !isNaN(target)) counter.target = Number(target);
  if (value !== undefined && !isNaN(value)) {
    const prevValue = counter.value;
    const numVal = Number(value);
    const diff = numVal - prevValue;

    counter.value = numVal;
    counter.totalClicks += 1;
    counter.sessionDelta += diff;
    if (numVal > counter.peakValue) counter.peakValue = numVal;

    counter.history.unshift({
      delta: diff,
      prevValue,
      value: numVal,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });
    if (counter.history.length > 50) counter.history.pop();
  }

  writeData(data);
  res.json(counter);
});

// MODIFY counter value (increment/decrement with delta)
app.post('/api/counters/:id/step', (req, res) => {
  const { id } = req.params;
  const { delta, isReset } = req.body;
  const data = readData();

  const counter = data.counters.find(c => c.id === id);
  if (!counter) {
    return res.status(404).json({ error: 'Counter not found' });
  }

  const prevValue = counter.value;
  let newValue;
  let effectiveDelta;

  if (isReset) {
    newValue = 0;
    effectiveDelta = -prevValue;
    counter.sessionDelta = 0;
  } else {
    effectiveDelta = Number(delta) || 0;
    newValue = prevValue + effectiveDelta;
    counter.totalClicks += 1;
    counter.sessionDelta += effectiveDelta;
  }

  if (newValue > counter.peakValue) {
    counter.peakValue = newValue;
  }

  counter.value = newValue;
  counter.history.unshift({
    delta: effectiveDelta,
    prevValue,
    value: newValue,
    isReset: !!isReset,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  });

  if (counter.history.length > 50) {
    counter.history.pop();
  }

  writeData(data);
  res.json(counter);
});

// UNDO last action on counter
app.post('/api/counters/:id/undo', (req, res) => {
  const { id } = req.params;
  const data = readData();

  const counter = data.counters.find(c => c.id === id);
  if (!counter) {
    return res.status(404).json({ error: 'Counter not found' });
  }

  if (!counter.history || counter.history.length === 0) {
    return res.status(400).json({ error: 'No history to undo' });
  }

  const last = counter.history.shift();
  counter.value = last.prevValue;
  counter.sessionDelta -= last.delta;

  writeData(data);
  res.json(counter);
});

// CLEAR history
app.post('/api/counters/:id/clear-history', (req, res) => {
  const { id } = req.params;
  const data = readData();

  const counter = data.counters.find(c => c.id === id);
  if (!counter) {
    return res.status(404).json({ error: 'Counter not found' });
  }

  counter.history = [];
  writeData(data);
  res.json(counter);
});

// DELETE counter
app.delete('/api/counters/:id', (req, res) => {
  const { id } = req.params;
  const data = readData();

  if (data.counters.length <= 1) {
    return res.status(400).json({ error: 'Cannot delete the only remaining counter' });
  }

  const index = data.counters.findIndex(c => c.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Counter not found' });
  }

  data.counters.splice(index, 1);
  if (data.activeCounterId === id) {
    data.activeCounterId = data.counters[0].id;
  }

  writeData(data);
  res.json({ success: true, activeCounterId: data.activeCounterId });
});

// Fallback to index.html for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize and start server
initStorage();
app.listen(PORT, () => {
  console.log(`🚀 OmniCounter Backend Server running at http://localhost:${PORT}`);
});

