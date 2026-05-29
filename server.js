const express = require('express');
const cors = require('cors');
const fs = require('fs');
const JSZip = require('jszip');
const { Octokit } = require('@octokit/rest');

const app = express();
const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const octokit = GITHUB_TOKEN ? new Octokit({ auth: GITHUB_TOKEN }) : null;
const REPO_OWNER = 'veeno7';
const REPO_NAME = 'projective-code-mvp';

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

async function commitToGitHub() {
  if (!octokit) return;
  try {
    const content = Buffer.from(JSON.stringify(store, null, 2)).toString('base64');
    const { data: file } = await octokit.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path: 'store.json' }).catch(()=>({data:{sha:null}}));
    await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: 'store.json',
      message: `5D save ${new Date().toISOString()}`,
      content,
      sha: file.sha || undefined
    });
  } catch(e){ console.log('GitHub commit failed', e.message); }
}

app.get('/api/project', (req, res) => {
  const x = parseInt(req.query.x) || 0;
  const y = parseInt(req.query.y) || 0;
  const z = parseInt(req.query.z) || 0;
  const w = parseFloat(req.query.w) || 0.9;
  const v = parseInt(req.query.v) || 0;
  res.json({ code: store[key(x, y, z, w, v)] || '// empty' });
});

app.post('/api/save', async (req, res) => {
  const { x, y, z, w, v, code } = req.body;
  store[key(x||0, y||0, z||0, w, v)] = code;
  try { fs.writeFileSync('./store.json', JSON.stringify(store, null, 2)); } catch (e) {}
  projectAll();
  await commitToGitHub();
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

app.get('/map', (req, res) => {
  let html = `<html><head><title>5D Map</title><style>body{background:#0b0f1a;color:#eee;font-family:system-ui;padding:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #333;padding:6px;text-align:center} .filled{background:#1a7f37}</style></head><body><h1>5D Store Map</h1><table><tr><th>coordinate</th><th>preview</th></tr>`;
  Object.keys(store).sort().forEach(k=>{
    const val = store[k].substring(0,40).replace(/</g,'&lt;');
    html += `<tr><td>${k}</td><td class="filled">${val}...</td></tr>`;
  });
  html += `</table></body></html>`;
  res.send(html);
});

// REAL LLM PROJECTOR - with diagnostics
app.post('/api/generate', async (req, res) => {
  const { x, intent } = req.body;
  const names = ['checkout','init','startGame'];
  const fn = names[x] || 'fn';
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  console.log('[5D] Generate:', { fn, intent, hasKey: !!OPENAI_KEY });

  if (!OPENAI_KEY) {
    console.log('[5D] Missing OPENAI_API_KEY - fallback');
    const code = `function ${fn}(){\n  // Intent: ${intent}\n  console.log('${String(intent).replace(/'/g,"\\'")}');\n  ${fn==='checkout'?"setTimeout(()=>window.parent.postMessage('INSTALL_CLICK','*'),100);":''}\n}`;
    return res.json({ code });
  }

  try {
    const prompt = `You are a 5D code projector. Output ONLY raw JavaScript for function ${fn}(). Intent: "${intent}". Platform: Facebook playable. ${fn==='checkout'?'Must call window.parent.postMessage("INSTALL_CLICK","*") within 100ms.':''} No markdown, no explanation.`;

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {role:'system', content:'You write only JavaScript code, no prose.'},
          {role:'user', content: prompt}
        ],
        temperature: 0.2,
        max_tokens: 600
      })
    });

    if (!r.ok) {
      const err = await r.text();
      console.log('[5D] OpenAI error', r.status, err);
      throw new Error(err);
    }

    const data = await r.json();
    let code = data.choices?.[0]?.message?.content || '';
    code = code.replace(/```javascript|```js|```/g,'').trim();
    if (!code.startsWith('function')) code = `function ${fn}(){\n${code}\n}`;

    console.log('[5D] LLM ok, bytes:', code.length);
    res.json({ code });

  } catch(e) {
    console.log('[5D] LLM failed:', e.message);
    res.json({ code: `function ${fn}(){ console.log('LLM error: ${e.message.replace(/'/g,"")}'); }` });
  }
});

app.listen(PORT, () => console.log('Lynex 5D running'));