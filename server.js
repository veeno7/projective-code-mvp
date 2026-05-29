const express = require('express');
const cors = require('cors');
const fs = require('fs');
const JSZip = require('jszip');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- 5D STORE (your current code is kept here) ---
const DEFAULTS = {
  "0,0,0,0.9,0": "function checkout(){ console.log('web version'); }",
  "0,0,0,0.9,1": "function checkout(){\n  console.log('playable CTA from 5D');\n  window.parent.postMessage('INSTALL_CLICK','*');\n}",
  "1,0,0,0.9,1": "function init(){ console.log('init playable'); }",
  "2,0,0,0.9,1": "function startGame(){ console.log('game start'); }",
  "0,0,0,0.3,1": "Intent: checkout must fire INSTALL_CLICK within 100ms",
  "1,0,0,0.3,1": "Intent: init preloads assets silently",
  "2,0,0,0.3,1": "Intent: startGame triggered by CTA only"
};

let store = { ...DEFAULTS };
try {
  const saved = JSON.parse(fs.readFileSync('./store.json', 'utf8'));
  store = { ...store, ...saved };
} catch (e) {}

const key = (x, y, z, w, v) => `${x},${y},${z},${w},${v}`;

function projectAll() {
  fs.mkdirSync('./public', { recursive: true });
  const playable = [0, 1, 2].map(x => store[key(x, 0, 0, 0.9, 1)] || '').join('\n\n');
  fs.writeFileSync('./public/playable.js', playable);
  fs.writeFileSync('./public/web.js', store[key(0, 0, 0, 0.9, 0)] || '');
}
projectAll();

app.get('/api/project', (req, res) => {
  const x = parseInt(req.query.x) || 0;
  const w = parseFloat(req.query.w) || 0.9;
  const v = parseInt(req.query.v) || 0;
  res.json({ code: store[key(x, 0, 0, w, v)] || '// empty' });
});

app.post('/api/save', (req, res) => {
  const { x, w, v, code } = req.body;
  store[key(x, 0, 0, w, v)] = code;
  try { fs.writeFileSync('./store.json', JSON.stringify(store, null, 2)); } catch (e) {}
  projectAll();
  res.json({ ok: true });
});

app.get('/export/playable.zip', async (req, res) => {
  projectAll();
  const zip = new JSZip();
  const html = fs.readFileSync('./public/demo.html', 'utf8');
  const js = fs.readFileSync('./public/playable.js', 'utf8');
  zip.file('index.html', html);
  zip.file('playable.js', js);
  zip.file('mraid.js', '// MRAID stub for Facebook');
  // NEW: include intents from w=0.3
  const readme = `# Lynex 5D Playable\n\n## Intents\n- checkout: ${store[key(0,0,0,0.3,1)]}\n- init: ${store[key(1,0,0,0.3,1)]}\n- startGame: ${store[key(2,0,0,0.3,1)]}\n`;
  zip.file('README.md', readme);
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': 'attachment; filename=lynex-playable.zip'
  });
  res.send(buf);
});

app.listen(PORT, () => console.log('Lynex 5D running'));