const express = require('express');
const cors = require('cors');
const fs = require('fs');
const JSZip = require('jszip');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- 5D STORE ---
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
  const y = parseInt(req.query.y) || 0;
  const z = parseInt(req.query.z) || 0;
  const w = parseFloat(req.query.w) || 0.9;
  const v = parseInt(req.query.v) || 0;
  res.json({ code: store[key(x, y, z, w, v)] || '// empty' });
});

app.post('/api/save', (req, res) => {
  const { x, y, z, w, v, code } = req.body;
  store[key(x||0, y||0, z||0, w, v)] = code;
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
  const readme = `# Lynex 5D Playable\n\n## Intents\n- checkout: ${store[key(0,0,0,0.3,1)]}\n- init: ${store[key(1,0,0,0.3,1)]}\n- startGame: ${store[key(2,0,0,0.3,1)]}\n`;
  zip.file('README.md', readme);
  zip.file('mraid.js', '// MRAID stub for Facebook');
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': 'attachment; filename=lynex-playable.zip'
  });
  res.send(buf);
});

// NEW: visual 5D map
app.get('/map', (req, res) => {
  let html = `<html><head><title>5D Map</title><style>body{background:#0b0f1a;color:#eee;font-family:system-ui;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #333;padding:6px;text-align:center} .filled{background:#1a7f37} .empty{background:#222}</style></head><body><h1>5D Store Map</h1><table><tr><th>x,y,z,w,v</th><th>status</th><th>preview</th></tr>`;
  Object.keys(store).sort().forEach(k=>{
    const val = store[k].substring(0,40).replace(/</g,'&lt;');
    html += `<tr><td>${k}</td><td class="filled">filled</td><td>${val}...</td></tr>`;
  });
  html += `</table><p>Total points: ${Object.keys(store).length}</p></body></html>`;
  res.send(html);
});

app.listen(PORT, () => console.log('Lynex 5D running'));