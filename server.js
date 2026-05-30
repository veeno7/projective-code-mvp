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

const DEFAULTS = {
  "0,0,0,0.9,0": "function checkout(){ console.log('web version'); }",
  "0,0,0,0.9,1": "function checkout(){\n console.log('playable CTA from 5D');\n window.parent.postMessage('INSTALL_CLICK','*');\n}",
  "1,0,0,0.9,1": "function init(){ console.log('init playable - preloading'); }",
  "2,0,0,0.9,1": "function startGame(){\n  scene.children.filter(c=>c.userData&&c.userData.fire).forEach(c=>scene.remove(c));\n  const fireGroup = new THREE.Group(); fireGroup.userData.fire = true;\n  const count = 80; const geo = new THREE.SphereGeometry(0.08, 8, 8);\n  for(let i=0; i<count; i++){\n    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.08 - Math.random()*0.05, 1, 0.6), transparent: true, opacity: 0.85 });\n    const p = new THREE.Mesh(geo, mat);\n    p.position.set((Math.random()-0.5)*0.6, Math.random()*0.2, (Math.random()-0.5)*0.6);\n    p.userData = { vy: 0.015 + Math.random()*0.02, life: Math.random() };\n    fireGroup.add(p);\n  }\n  scene.add(fireGroup);\n  const light = new THREE.PointLight(0xff6600, 2, 5); light.position.set(0, 0.5, 0); light.userData.fire = true; scene.add(light);\n  const animateFire = () => {\n    fireGroup.children.forEach(p => {\n      p.position.y += p.userData.vy; p.userData.life += 0.02;\n      p.material.opacity = 0.85 * (1 - p.userData.life*0.3);\n      p.scale.setScalar(1 + p.userData.life*0.5);\n      if(p.position.y > 2.5){ p.position.y = 0; p.userData.life = 0; }\n    });\n    light.intensity = 1.5 + Math.sin(Date.now()*0.01)*0.5;\n    requestAnimationFrame(animateFire);\n  };\n  animateFire();\n}",
  "0,0,0,0.3,1": "Intent: checkout must fire INSTALL_CLICK within 100ms",
  "1,0,0,0.3,1": "Intent: init preloads assets silently",
  "2,0,0,0.3,1": "Intent: startGame creates flickering fire particles"
};

let store = { ...DEFAULTS };
try { const saved = JSON.parse(fs.readFileSync('./store.json', 'utf8')); store = { ...store, ...saved }; } catch (e) {}

const key = (x, y, z, w, v) => `${x},${y},${z},${w},${v}`;

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

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.145.0/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/controls/OrbitControls.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/loaders/GLTFLoader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/shaders/LuminosityHighPassShader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/shaders/CopyShader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/postprocessing/EffectComposer.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/postprocessing/RenderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/postprocessing/ShaderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/postprocessing/UnrealBloomPass.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js"></script>

<script>
  window.onerror = function(msg, src, line) {
    var e = document.getElementById('err');
    e.style.display = 'block';
    e.textContent += 'ERROR: ' + msg + '\\n' + (src||'') + ':' + line + '\\n\\n';
  };

  window.scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.Fog(0x000000, 15, 50);

  window.camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 200);
  camera.position.set(0, 1.6, 4.5);

  window.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);

  var sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(5, 8, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0x222233, 0x000000, 0.25));
  scene.add(new THREE.AmbientLight(0x111122, 0.3));

  window.controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1, 0);

  var composer = null;
  try {
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(new THREE.RenderPass(scene, camera));
    composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.5, 0.4, 0.85));
    window.composer = composer;
  } catch(e) { composer = null; }

  window.world = new CANNON.World();
  world.gravity.set(0, -9.82, 0);
  var gb = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  gb.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(gb);

  window.listener = new THREE.AudioListener();
  camera.add(listener);
  window.loader = new THREE.GLTFLoader();
  window.mixers = [];
  window.makeParticles = function(n, c) {
    var g = new THREE.BufferGeometry();
    var a = new Float32Array(n * 3);
    for (var i = 0; i < n * 3; i++) a[i] = (Math.random() - 0.5) * 6;
    g.setAttribute('position', new THREE.BufferAttribute(a, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ color: c, size: 0.06, transparent: true }));
  };

  var ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1, metalness: 0 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  var t = 0;
  function animate() {
    requestAnimationFrame(animate);
    t += 0.001;
    sun.position.x = Math.cos(t) * 8;
    sun.position.z = Math.sin(t) * 8;
    world.step(1/60);
    controls.update();
    mixers.forEach(function(m) { m.update(0.016); });
    if (composer) { composer.render(); } else { renderer.render(scene, camera); }
  }
  animate();

  window.addEventListener('resize', function() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    if (composer) composer.setSize(innerWidth, innerHeight);
  });

  var s = document.createElement('script');
  s.src = '/playable.js?v=' + Date.now();
  s.onload = function() { try { init(); } catch(e) {} };
  document.body.appendChild(s);

  function play() {
    document.getElementById('cta').style.display = 'none';
    try { startGame(); } catch(e) {}
    setTimeout(function() { try { checkout(); } catch(e) {} }, 1200);
  }
  window.play = play;
  if (location.search.includes('auto')) play();
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
    const { data: file } = await octokit.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path: 'store.json' }).catch(() => ({ data: { sha: null } }));
    await octokit.repos.createOrUpdateFileContents({ owner: REPO_OWNER, repo: REPO_NAME, path: 'store.json', message: `5D save ${new Date().toISOString()}`, content, sha: file.sha || undefined });
  } catch(e) {}
}

app.get('/api/project', (req, res) => {
  const x = parseInt(req.query.x) || 0; const y = parseInt(req.query.y) || 0; const z = parseInt(req.query.z) || 0; const w = parseFloat(req.query.w) || 0.9; const v = parseInt(req.query.v) || 0;
  res.json({ code: store[key(x, y, z, w, v)] || '// empty' });
});

app.post('/api/save', async (req, res) => {
  const { x, y, z, w, v, code } = req.body;
  store[key(x||0, y||0, z||0, w, v)] = code;
  try { fs.writeFileSync('./store.json', JSON.stringify(store, null, 2)); } catch (e) {}
  projectAll(); await commitToGitHub();
  const version = Date.now();
  res.json({ ok: true, preview: `https://lynex-editor.onrender.com/demo.html?auto=1&v=${version}` });
});

app.get('/export/playable.zip', async (req, res) => {
  projectAll();
  const zip = new JSZip();
  zip.file('index.html', fs.readFileSync('./public/demo.html', 'utf8'));
  zip.file('playable.js', fs.readFileSync('./public/playable.js', 'utf8'));
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  res.set({ 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename=lynex-playable.zip' });
  res.send(buf);
});

app.post('/api/generate', async (req, res) => {
  const { x, intent } = req.body;
  const fn = ['checkout', 'init', 'startGame'][x] || 'fn';
  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  const prompt = `Scene has: scene, camera, renderer, composer, sun, controls, world, loader, makeParticles(). Add: "${intent}". Use MeshStandardMaterial, castShadow=true, position y>0. Return ONLY JavaScript.`;
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'user', content: prompt }], temperature: 0.75, max_tokens: 1400 }) });
    const data = await r.json();
    let inner = (data.choices?.[0]?.message?.content || '').replace(/```[\w]*/g, '').replace(/```/g, '').trim();
    const code = `function ${fn}(){\n${inner}\n${fn === 'checkout' ? "setTimeout(()=>window.parent.postMessage('INSTALL_CLICK','*'),2800);" : ""}\n}`;
    res.json({ code });
  } catch(e) { res.json({ code: `function ${fn}(){}` }); }
});

app.listen(PORT, () => console.log('Lynex 5D PRO running'));