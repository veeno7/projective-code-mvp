const express = require('express');
const cors = require('cors');
const fs = require('fs');
const JSZip = require('jszip');
const { Octokit } = require('@octokit/rest');

const app = express();
const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const RENDER_API_KEY = process.env.RENDER_API_KEY;
const RENDER_SERVICE_ID = process.env.RENDER_SERVICE_ID;
const octokit = GITHUB_TOKEN ? new Octokit({ auth: GITHUB_TOKEN }) : null;
const REPO_OWNER = 'veeno7';
const REPO_NAME = 'projective-code-mvp';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============================================================
// 5D STORE
// ============================================================
const DEFAULTS = {
  "0,0,0,0.9,0": "function checkout(){ console.log('web version'); }",
  "0,0,0,0.9,1": "function checkout(){\n  function makeFire() {\n    const fireGeometry = new THREE.SphereGeometry(0.5, 32, 32);\n    const fireMaterial = new THREE.MeshStandardMaterial({\n      color: 0xff4500,\n      emissive: 0xff4500,\n      emissiveIntensity: 1,\n      roughness: 0.9,\n      metalness: 0.1\n    });\n    const fire = new THREE.Mesh(fireGeometry, fireMaterial);\n    fire.castShadow = true;\n    fire.position.set(0, 0.5, 0);\n    scene.add(fire);\n  }\n  makeFire();\n  setTimeout(()=>window.parent.postMessage('INSTALL_CLICK','*'),2800);\n}",
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

let projectLog = [];
try { projectLog = JSON.parse(fs.readFileSync('./project-log.json', 'utf8')); } catch(e) {}

const key = (x, y, z, w, v) => `${x},${y},${z},${w},${v}`;

// ============================================================
// PROJECT ALL — assembles 3D demo from 5D store
// ============================================================
function projectAll() {
  fs.mkdirSync('./public', { recursive: true });
  const playable = [0, 1, 2].map(x => store[key(x, 0, 0, 0.9, 1)] || '').join('\n\n');
  fs.writeFileSync('./public/playable.js', playable);
  fs.writeFileSync('./public/web.js', store[key(0, 0, 0, 0.9, 0)] || '');

  const demoHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>Lynex 5D PRO</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:#000;overflow:hidden;width:100vw;height:100vh}
  canvas{display:block}
  #cta{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;z-index:10}
  #err{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.92);color:#ff5555;font-family:monospace;font-size:13px;padding:20px;z-index:999;white-space:pre-wrap;overflow:auto}
  button{padding:16px 32px;font-size:18px;background:#7c5cff;color:white;border:none;border-radius:12px;cursor:pointer}
  h1{color:white;margin:0 0 12px;font-family:system-ui}
</style>
</head>
<body>
<div id="cta"><h1>Lynex 5D</h1><button onclick="play()">Play Now</button></div>
<div id="err"></div>
<!-- Only two guaranteed CDN deps: Three.js core + cannon-es -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js"></script>
<script>
  window.onerror=function(msg,src,line){var e=document.getElementById('err');e.style.display='block';e.textContent+='ERROR: '+msg+'\\n'+(src||'')+':'+line+'\\n\\n';};

  // Scene
  window.scene=new THREE.Scene();
  scene.background=new THREE.Color(0x050810);
  scene.fog=new THREE.Fog(0x050810,12,45);

  // Camera
  window.camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,200);
  camera.position.set(0,3,8);
  camera.lookAt(0,1,0);

  // Renderer
  window.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setSize(innerWidth,innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.25;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Lights
  var sun=new THREE.DirectionalLight(0xffeedd,1.8);
  sun.position.set(6,9,4);sun.castShadow=true;
  sun.shadow.mapSize.width=1024;sun.shadow.mapSize.height=1024;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x99aaff,0x111122,0.7));
  scene.add(new THREE.AmbientLight(0x333344,0.5));

  // Ground
  var ground=new THREE.Mesh(
    new THREE.PlaneGeometry(60,60),
    new THREE.MeshStandardMaterial({color:0x101625,roughness:0.85,metalness:0.05})
  );
  ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);

  // Physics
  window.world=new CANNON.World({gravity:new CANNON.Vec3(0,-9.82,0)});
  var gb=new CANNON.Body({type:CANNON.Body.STATIC,shape:new CANNON.Plane()});
  gb.quaternion.setFromEuler(-Math.PI/2,0,0);world.addBody(gb);

  // Helpers for generated code
  window.mixers=[];
  window.makeParticles=function(n,c){
    var g=new THREE.BufferGeometry();
    var a=new Float32Array(n*3);
    for(var i=0;i<n*3;i++)a[i]=(Math.random()-0.5)*6;
    g.setAttribute('position',new THREE.BufferAttribute(a,3));
    return new THREE.Points(g,new THREE.PointsMaterial({color:c,size:0.06,transparent:true}));
  };
  window.controls={update:function(){}};
  window.composer=null;
  window.loader=null;

  // Render loop
  var t=0,clock=new THREE.Clock();
  function animate(){
    requestAnimationFrame(animate);
    t+=0.0015;
    sun.position.x=Math.cos(t)*9;
    sun.position.z=Math.sin(t)*9;
    try{world.step(1/60,clock.getDelta(),3);}catch(e){}
    mixers.forEach(function(m){try{m.update(0.016);}catch(e){}});
    renderer.render(scene,camera);
  }
  animate();

  window.addEventListener('resize',function(){
    camera.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
  });

  // Load generated scene code after everything is ready
  var s=document.createElement('script');
  s.src='/playable.js?v='+Date.now();
  s.onload=function(){try{init();}catch(e){console.warn('init:',e);}};
  s.onerror=function(){console.warn('playable.js failed');};
  document.body.appendChild(s);

  function play(){
    document.getElementById('cta').style.display='none';
    try{startGame();}catch(e){}
    setTimeout(function(){try{checkout();}catch(e){}},1200);
  }
  window.play=play;
  if(location.search.includes('auto'))play();
</script>
</body>
</html>`;

  fs.writeFileSync('./public/demo.html', demoHtml);
}
projectAll();

// ============================================================
// GITHUB HELPERS
// ============================================================
async function commitToGitHub() {
  if (!octokit) return;
  try {
    const content = Buffer.from(JSON.stringify(store, null, 2)).toString('base64');
    const { data: file } = await octokit.repos.getContent({
      owner: REPO_OWNER, repo: REPO_NAME, path: 'store.json'
    }).catch(() => ({ data: { sha: null } }));
    await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER, repo: REPO_NAME, path: 'store.json',
      message: `5D save ${new Date().toISOString()}`,
      content, sha: file.sha || undefined
    });
  } catch(e) { console.log('GitHub commit failed:', e.message); }
}

async function getFileSha(repoName, filePath) {
  try {
    const { data } = await octokit.repos.getContent({ owner: REPO_OWNER, repo: repoName, path: filePath });
    return data.sha;
  } catch(e) { return null; }
}

async function commitFileToGitHub(repoName, filePath, content, message) {
  if (!octokit) return null;
  const sha = await getFileSha(repoName, filePath);
  const encoded = Buffer.from(content).toString('base64');
  const result = await octokit.repos.createOrUpdateFileContents({
    owner: REPO_OWNER, repo: repoName, path: filePath,
    message, content: encoded, sha: sha || undefined
  });
  return result.data;
}

async function createGitHubRepo(repoName, description) {
  if (!octokit) return null;
  try {
    const { data } = await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      description: description || 'Generated by Lynex 5D',
      auto_init: false,
      private: false
    });
    return data;
  } catch(e) {
    if (e.status === 422) return { html_url: `https://github.com/${REPO_OWNER}/${repoName}` };
    throw e;
  }
}

// ============================================================
// RENDER DEPLOY TRIGGER
// ============================================================
async function triggerRenderDeploy() {
  if (!RENDER_API_KEY || !RENDER_SERVICE_ID) return null;
  try {
    const r = await fetch(`https://api.render.com/v1/services/${RENDER_SERVICE_ID}/deploys`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RENDER_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ clearCache: 'do_not_clear' })
    });
    const data = await r.json();
    return data.id || null;
  } catch(e) { console.log('Render deploy failed:', e.message); return null; }
}

// ============================================================
// EXISTING 5D ROUTES
// ============================================================
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

app.get('/p/:v', (req, res) => { res.redirect(`/demo.html?auto=1&v=${req.params.v}`); });
app.get('/preview', (req, res) => { res.redirect(`/demo.html?auto=1&v=${Date.now()}`); });

app.get('/export/playable.zip', async (req, res) => {
  projectAll();
  const zip = new JSZip();
  zip.file('index.html', fs.readFileSync('./public/demo.html', 'utf8'));
  zip.file('playable.js', fs.readFileSync('./public/playable.js', 'utf8'));
  zip.file('README.md', `# Lynex 5D Playable\nBuilt ${new Date().toISOString()}`);
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  res.set({ 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename=lynex-playable.zip' });
  res.send(buf);
});

app.get('/map', (req, res) => {
  const rows = Object.entries(store).map(([k, v]) =>
    `<tr><td>${k}</td><td><pre style="max-height:80px;overflow:auto">${v.slice(0, 200)}</pre></td></tr>`
  ).join('');
  res.send(`<html><head><title>5D Map</title><style>body{background:#0b0f1a;color:#eee;font-family:system-ui;padding:20px}table{width:100%;border-collapse:collapse}td{border:1px solid #333;padding:6px;vertical-align:top}pre{margin:0}</style></head><body><h1>5D Store (${Object.keys(store).length} entries)</h1><table>${rows}</table></body></html>`);
});

// ============================================================
// 3D SCENE GENERATOR
// ============================================================
app.post('/api/generate', async (req, res) => {
  const { x, intent } = req.body;
  const fn = ['checkout', 'init', 'startGame'][x] || 'fn';
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  const prompt = `Scene already has: scene, camera, renderer, composer (bloom), sun, controls, world (cannon-es physics), loader (GLTFLoader), makeParticles(), listener (audio), mixers[].
Add: "${intent}". Use MeshStandardMaterial with roughness/metalness, castShadow=true. Position at y=0+. Do NOT recreate scene/camera. Return ONLY the inner JavaScript code. No markdown, no code fences, no explanation.`;

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'user', content: prompt }], temperature: 0.75, max_tokens: 1400 })
    });
    const data = await r.json();
    let inner = (data.choices?.[0]?.message?.content || '')
      .replace(/```[\w]*/g, '').replace(/```/g, '').trim();
    const code = `function ${fn}(){\n${inner}\n${fn === 'checkout' ? "setTimeout(()=>window.parent.postMessage('INSTALL_CLICK','*'),2800);" : ""}\n}`;
    res.json({ code });
  } catch(e) {
    res.json({ code: `function ${fn}(){}` });
  }
});

// ============================================================
// CODEBASE GENERATOR — generates full deployable projects
// ============================================================
app.post('/api/generate-project', async (req, res) => {
  const { intent, projectType, repoName } = req.body;
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!intent) return res.status(400).json({ error: 'intent is required' });

  const slug = (repoName || intent.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30))
    + '-' + Date.now().toString().slice(-5);

  const systemPrompt = `You are Lynex 5D — a dimensional code compiler. You generate complete, deployable Node.js codebases from natural language.

Respond with ONLY a valid JSON object. No markdown. No explanation. No code fences. Raw JSON only.

Structure:
{
  "name": "project name",
  "description": "one sentence description",
  "files": {
    "server.js": "...complete file...",
    "package.json": "...complete file...",
    "public/index.html": "...complete file...",
    "README.md": "...complete file..."
  },
  "startCommand": "node server.js",
  "envVars": []
}

Rules:
- server.js uses Express on process.env.PORT || 3000
- package.json includes "start":"node server.js" and "engines":{"node":">=18.0.0"}
- No external databases — use in-memory stores
- No TypeScript, no build steps — plain Node.js only
- Mobile-first responsive HTML with beautiful dark UI
- Code must be 100% complete and runnable`;

  const userPrompt = `Build: "${intent}"\nType: ${projectType || 'web app'}\nMake it complete, beautiful, and deployable to Render.com with zero configuration.`;

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        temperature: 0.7,
        max_tokens: 4000
      })
    });
    const data = await r.json();
    let raw = (data.choices?.[0]?.message?.content || '').replace(/```[\w]*/g, '').replace(/```/g, '').trim();

    let project;
    try { project = JSON.parse(raw); }
    catch(e) { return res.status(500).json({ error: 'AI returned invalid JSON. Try again.', raw: raw.slice(0, 300) }); }

    // Save files locally
    const projectDir = `./projects/${slug}`;
    for (const [filePath, content] of Object.entries(project.files || {})) {
      const fullPath = `${projectDir}/${filePath}`;
      fs.mkdirSync(fullPath.substring(0, fullPath.lastIndexOf('/')), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }

    // Push to GitHub and trigger Render
    let githubUrl = null;
    if (octokit) {
      try {
        await createGitHubRepo(slug, project.description);
        await new Promise(r => setTimeout(r, 1500));
        for (const [filePath, content] of Object.entries(project.files || {})) {
          await commitFileToGitHub(slug, filePath, content, `Lynex 5D: ${project.name}`);
        }
        githubUrl = `https://github.com/${REPO_OWNER}/${slug}`;
        await triggerRenderDeploy();
      } catch(e) { console.log('GitHub error:', e.message); }
    }

    const entry = {
      id: slug, intent, projectType: projectType || 'web app',
      name: project.name, description: project.description,
      files: Object.keys(project.files || {}),
      githubUrl, zipUrl: `/api/export-project/${slug}`,
      deployUrl: githubUrl ? `https://${slug}.onrender.com` : null,
      createdAt: new Date().toISOString()
    };
    projectLog.unshift(entry);
    if (projectLog.length > 100) projectLog = projectLog.slice(0, 100);
    try { fs.writeFileSync('./project-log.json', JSON.stringify(projectLog, null, 2)); } catch(e) {}

    res.json({
      ok: true,
      project: entry,
      files: project.files,
      envVars: project.envVars || [],
      zipUrl: `/api/export-project/${slug}`,
      githubUrl,
      renderSteps: githubUrl ? [
        `1. render.com → New Web Service`,
        `2. Connect: ${githubUrl}`,
        `3. Build: npm install`,
        `4. Start: ${project.startCommand || 'node server.js'}`,
        `5. Live in ~2 minutes`
      ] : [`GitHub not connected — download ZIP and deploy manually`]
    });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
// EXPORT PROJECT AS ZIP
// ============================================================
app.get('/api/export-project/:slug', async (req, res) => {
  const projectDir = `./projects/${req.params.slug}`;
  if (!fs.existsSync(projectDir)) return res.status(404).json({ error: 'Project not found' });

  const zip = new JSZip();
  function addDir(dir, zipPath) {
    for (const item of fs.readdirSync(dir)) {
      const full = `${dir}/${item}`;
      const zp = zipPath ? `${zipPath}/${item}` : item;
      if (fs.statSync(full).isDirectory()) addDir(full, zp);
      else zip.file(zp, fs.readFileSync(full));
    }
  }
  addDir(projectDir, '');

  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  res.set({ 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename=${req.params.slug}.zip` });
  res.send(buf);
});

// ============================================================
// PROJECTS DASHBOARD
// ============================================================
app.get('/api/projects', (req, res) => res.json(projectLog));

app.get('/projects', (req, res) => {
  const rows = projectLog.map(p => `
    <tr>
      <td><strong>${p.name || p.id}</strong><br><span style="color:#555;font-size:11px">${p.id}</span></td>
      <td>${p.intent}</td>
      <td style="color:#7c5cff">${p.projectType}</td>
      <td style="font-size:11px;color:#666">${(p.files || []).join(', ')}</td>
      <td>
        ${p.githubUrl ? `<a href="${p.githubUrl}" target="_blank">GitHub</a> · ` : ''}
        <a href="${p.zipUrl}">ZIP</a>
        ${p.deployUrl ? ` · <a href="${p.deployUrl}" target="_blank">Live</a>` : ''}
      </td>
      <td style="font-size:11px;color:#666">${new Date(p.createdAt).toLocaleString()}</td>
    </tr>`).join('');
  res.send(`<!DOCTYPE html><html><head><title>Lynex Projects</title>
<style>body{background:#0b0f1a;color:#eee;font-family:system-ui;padding:24px}
table{width:100%;border-collapse:collapse;margin-top:16px}
td,th{border:1px solid #1a1f30;padding:10px;vertical-align:top;font-size:13px}
th{background:#151b2c;color:#7c5cff;font-size:12px;letter-spacing:0.05em}
a{color:#00e676;text-decoration:none}h1{font-size:22px}</style></head>
<body><h1>⚡ Lynex Generated Projects <span style="font-size:14px;color:#555">(${projectLog.length})</span></h1>
<table><tr><th>Name</th><th>Intent</th><th>Type</th><th>Files</th><th>Links</th><th>Created</th></tr>
${rows || '<tr><td colspan="6" style="text-align:center;color:#555;padding:40px">No projects yet. Use Generate Project to create one.</td></tr>'}
</table></body></html>`);
});

// ============================================================
// PUBLIC API — for external developers
// Header: x-lynex-key: your-api-key
// ============================================================
const API_KEYS = new Set((process.env.LYNEX_API_KEYS || 'dev-key-123').split(',').map(k => k.trim()));

function requireApiKey(req, res, next) {
  const k = req.headers['x-lynex-key'] || req.query.key;
  if (!k || !API_KEYS.has(k)) {
    return res.status(401).json({ error: 'Invalid or missing API key. Visit lynex-editor.onrender.com to get access.' });
  }
  next();
}

// External developers call this to generate a 3D scene snippet
app.post('/v1/generate-scene', requireApiKey, async (req, res) => {
  const { intent, slot } = req.body;
  req.body.x = slot || 1;
  req.body.intent = intent;
  // Re-use internal generate logic
  const fn = ['checkout', 'init', 'startGame'][req.body.x] || 'fn';
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const prompt = `Scene has: scene, camera, renderer, composer, world (cannon-es), makeParticles(), mixers[]. Add: "${intent}". Return ONLY inner JS. No markdown.`;
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'user', content: prompt }], max_tokens: 1400 })
    });
    const data = await r.json();
    let inner = (data.choices?.[0]?.message?.content || '').replace(/```[\w]*/g, '').replace(/```/g, '').trim();
    res.json({ ok: true, code: `function ${fn}(){\n${inner}\n}`, fn });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// External developers call this to generate a full codebase
app.post('/v1/generate-project', requireApiKey, (req, res, next) => {
  // Delegates to internal endpoint
  req.url = '/api/generate-project';
  next();
});

app.get('/v1/projects', requireApiKey, (req, res) => res.json(projectLog));

// ============================================================
// START
// ============================================================
app.listen(PORT, () => console.log(`Lynex 5D PRO running on port ${PORT}`));
