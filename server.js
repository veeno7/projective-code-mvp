const express = require('express');
const cors = require('cors');
const fs = require('fs');
const JSZip = require('jszip');
const { Octokit } = require('@octokit/rest');

const app = express();
const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const octokit = GITHUB_TOKEN? new Octokit({ auth: GITHUB_TOKEN }) : null;
const REPO_OWNER = 'veeno7';
const REPO_NAME = 'projective-code-mvp';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- 5D STORE ---
const DEFAULTS = {
  "0,0,0,0.9,0": "function checkout(){ console.log('web version'); }",
  "0,0,0,0.9,1": "function checkout(){\n console.log('playable CTA from 5D');\n window.parent.postMessage('INSTALL_CLICK','*');\n}",
  "1,0,0,0.9,1": "function init(){ console.log('init playable'); }",
  "2,0,0,0.9,1": "function startGame(){ console.log('game start'); }",
  "0,0,0,0.3,1": "Intent: checkout must fire INSTALL_CLICK within 100ms",
  "1,0,0,0.3,1": "Intent: init preloads assets silently",
  "2,0,0,0.3,1": "Intent: startGame triggered by CTA only"
};

let store = {...DEFAULTS };
try {
  const saved = JSON.parse(fs.readFileSync('./store.json', 'utf8'));
  store = {...store,...saved };
} catch (e) {}

const key = (x, y, z, w, v) => `${x},${y},${z},${w},${v}`;

function projectAll() {
  fs.mkdirSync('./public', { recursive: true });
  const playable = [0, 1, 2].map(x => store[key(x, 0, 0, 0.9, 1)] || '').join('\n\n');
  fs.writeFileSync('./public/playable.js', playable);
  fs.writeFileSync('./public/web.js', store[key(0, 0, 0, 0.9, 0)] || '');

  const demoHtml = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lynex 5D Preview</title>
<script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
<style>body{margin:0;background:#000;overflow:hidden;font-family:system-ui}#cta{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;z-index:10}button{padding:16px 32px;font-size:18px;background:#7c5cff;color:white;border:none;border-radius:12px}</style>
</head>
<body>
  <div id="cta"><h1 style="color:white">Tap to Install</h1><button onclick="play()">Play Now</button></div>
  <script src="/playable.js?v=${Date.now()}"></script>
  <script>
    try{init()}catch(e){}
    function play(){
      document.getElementById('cta').style.display='none';
      try{startGame()}catch(e){}
      setTimeout(()=>{try{checkout()}catch(e){}}, 1500);
    }
    if(location.search.includes('auto')) play();
  </script>
</body>
</html>`;
  fs.writeFileSync('./public/demo.html', demoHtml);
}
projectAll();

async function commitToGitHub() {
  if (!octokit) return;
  try {
    const content = Buffer.from(JSON.stringify(store, null, 2)).toString('base64');
    const { data: file } = await octokit.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path: 'store.json' }).catch(()=>({data:{sha:null}}));
    await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER, repo: REPO_NAME, path: 'store.json',
      message: `5D save ${new Date().toISOString()}`,
      content, sha: file.sha || undefined
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
  const version = Date.now();
  res.json({
    ok: true,
    preview: `https://lynex-editor.onrender.com/p/${version}`,
    auto: `https://lynex-editor.onrender.com/demo.html?auto=1&v=${version}`
  });
});

app.get('/p/:v', (req,res)=>{
  res.redirect(`/demo.html?auto=1&v=${req.params.v}`);
});

app.get('/preview', (req,res)=>{
  res.redirect(`/demo.html?auto=1&v=${Date.now()}`);
});

app.get('/export/playable.zip', async (req, res) => {
  projectAll();
  const zip = new JSZip();
  let html = fs.readFileSync('./public/demo.html', 'utf8');
  const js = fs.readFileSync('./public/playable.js', 'utf8');
  zip.file('index.html', html);
  zip.file('playable.js', js);
  const readme = `# Lynex 5D Playable\n\nBuilt ${new Date().toISOString()}`;
  zip.file('README.md', readme);
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  res.set({'Content-Type':'application/zip','Content-Disposition':'attachment; filename=lynex-playable.zip'});
  res.send(buf);
});

app.get('/map', (req, res) => {
  let html = `<html><head><title>5D Map</title><style>body{background:#0b0f1a;color:#eee;font-family:system-ui;padding:20px}</style></head><body><h1>5D Store</h1></body></html>`;
  res.send(html);
});

// BULLETPROOF GENERATOR - ALWAYS WORKS
app.post('/api/generate', async (req, res) => {
  const { x, intent } = req.body;
  const names = ['checkout','init','startGame'];
  const fn = names[x] || 'fn';
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  const THREE_BASE = `const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,0.1,1000);const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setSize(window.innerWidth,window.innerHeight);document.body.innerHTML='';document.body.appendChild(renderer.domElement);camera.position.z=6;scene.add(new THREE.AmbientLight(0xffffff,0.9));`;

  if (!OPENAI_KEY) {
    const code = `function ${fn}(){${THREE_BASE} const g=new THREE.BufferGeometry();const c=5000;const p=new Float32Array(c*3);for(let i=0;i<c*3;i++)p[i]=(Math.random()-0.5)*10;g.setAttribute('position',new THREE.BufferAttribute(p,3));const m=new THREE.PointsMaterial({color:0xffdd00,size:0.05});const pts=new THREE.Points(g,m);scene.add(pts);function a(){requestAnimationFrame(a);pts.rotation.y+=0.002;renderer.render(scene,camera);}a();${fn==='checkout'?`setTimeout(()=>window.parent.postMessage('INSTALL_CLICK','*'),3000);`:''}}`;
    return res.json({ code });
  }

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {role:'system', content: 'Write ONLY JavaScript code for inside a function. Create 5000 particles with THREE.BufferGeometry. Animate them. No explanation, no markdown.'},
          {role:'user', content: `Effect: ${intent}. Use existing scene, camera, renderer.`}
        ],
        temperature: 0.8, max_tokens: 1000
      })
    });
    const data = await r.json();
    let inner = (data.choices?.[0]?.message?.content || '').replace(/```/g,'').trim();

    const code = `function ${fn}(){
  ${THREE_BASE}
  ${inner}
  function animate(){requestAnimationFrame(animate);renderer.render(scene,camera);}animate();
  ${fn==='checkout'?`setTimeout(()=>window.parent.postMessage('INSTALL_CLICK','*'),3000);`:''}
}`;
    res.json({ code });
  } catch(e) {
    const code = `function ${fn}(){${THREE_BASE}}`;
    res.json({ code });
  }
});

app.listen(PORT, () => console.log('Lynex 5D running - HIGH END'));