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

// --- 5D STORE (YOUR ORIGINALS) ---
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

  // PRO DEMO WITH ALL 10 FEATURES
  const demoHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lynex 5D PRO</title>
<script type="importmap">{"imports":{"three":"https://unpkg.com/three@0.160.0/build/three.module.js","three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/","cannon":"https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/+esm"}}</script>
<style>body{margin:0;background:#000;overflow:hidden;font-family:system-ui}#cta{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;z-index:10}button{padding:16px 32px;font-size:18px;background:#7c5cff;color:white;border:none;border-radius:12px}</style>
</head><body>
<div id="cta"><h1 style="color:white;margin:0 0 12px">Lynex 5D</h1><button onclick="play()">Play Now</button></div>
<script type="module">
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import * as CANNON from 'cannon';

window.scene=new THREE.Scene();scene.background=new THREE.Color(0x050810);scene.fog=new THREE.Fog(0x050810,12,45);
window.camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,200);camera.position.set(0,1.6,4.5);
window.renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// LIGHTS + DAY/NIGHT
const sun=new THREE.DirectionalLight(0xffeedd,1.8);sun.position.set(6,9,4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);scene.add(sun);
scene.add(new THREE.HemisphereLight(0x99aaff,0x111122,0.7));scene.add(new THREE.AmbientLight(0x333344,0.5));

// HDRI ENVIRONMENT
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new THREE.Scene()).texture;

// CONTROLS
window.controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,1,0);

// POST (BLOOM)
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.75,0.5,0.1));window.composer=composer;

// PHYSICS
window.world=new CANNON.World({gravity:new CANNON.Vec3(0,-9.82,0)});const gb=new CANNON.Body({type:CANNON.Body.STATIC,shape:new CANNON.Plane()});gb.quaternion.setFromEuler(-Math.PI/2,0,0);world.addBody(gb);

// AUDIO + LOADERS
window.listener=new THREE.AudioListener();camera.add(listener);window.loader=new GLTFLoader();
window.makeParticles=(n,c)=>{const g=new THREE.BufferGeometry();const a=new Float32Array(n*3);for(let i=0;i<n*3;i++)a[i]=(Math.random()-0.5)*6;g.setAttribute('position',new THREE.BufferAttribute(a,3));return new THREE.Points(g,new THREE.PointsMaterial({color:c,size:0.06,transparent:true}));};
window.mixers=[];

// GROUND
const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:0x101625,roughness:0.85,metalness:0.05}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);

let t=0;function animate(){requestAnimationFrame(animate);t+=0.0015;sun.position.x=Math.cos(t)*9;sun.position.z=Math.sin(t)*9;world.step(1/60);controls.update();mixers.forEach(m=>m.update(0.016));composer.render();}
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});
</script>
<script src="/playable.js?v=${Date.now()}"></script>
<script>
try{init()}catch(e){}
function play(){document.getElementById('cta').style.display='none';try{startGame()}catch(e){}setTimeout(()=>{try{checkout()}catch(e){}},1200);}
if(location.search.includes('auto'))play();
</script></body></html>`;
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

app.get('/p/:v', (req,res)=>{ res.redirect(`/demo.html?auto=1&v=${req.params.v}`); });
app.get('/preview', (req,res)=>{ res.redirect(`/demo.html?auto=1&v=${Date.now()}`); });

app.get('/export/playable.zip', async (req, res) => {
  projectAll();
  const zip = new JSZip();
  zip.file('index.html', fs.readFileSync('./public/demo.html', 'utf8'));
  zip.file('playable.js', fs.readFileSync('./public/playable.js', 'utf8'));
  zip.file('README.md', `# Lynex 5D Playable\nBuilt ${new Date().toISOString()}`);
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  res.set({'Content-Type':'application/zip','Content-Disposition':'attachment; filename=lynex-playable.zip'});
  res.send(buf);
});

app.get('/map', (req, res) => {
  const rows = Object.entries(store).map(([k,v])=>`<tr><td>${k}</td><td><pre style="max-height:80px;overflow:auto">${v.slice(0,200)}</pre></td></tr>`).join('');
  res.send(`<html><head><title>5D Map</title><style>body{background:#0b0f1a;color:#eee;font-family:system-ui;padding:20px}table{width:100%;border-collapse:collapse}td{border:1px solid #333;padding:6px;vertical-align:top}pre{margin:0}</style></head><body><h1>5D Store (${Object.keys(store).length} entries)</h1><table>${rows}</table></body></html>`);
});

// PRO GENERATOR
app.post('/api/generate', async (req, res) => {
  const { x, intent } = req.body;
  const fn = ['checkout','init','startGame'][x] || 'fn';
  const OPENAI_KEY = process.env.OPENAI_API_KEY;

  const prompt = `Scene already has: scene, camera, renderer, composer (bloom), sun, controls, world (cannon-es physics), loader (GLTFLoader), makeParticles(), listener (audio), mixers[].

Add: "${intent}". Use MeshStandardMaterial with roughness/metalness, castShadow=true. Position at y=0+. Do NOT recreate scene/camera. Return ONLY inner code.`;

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-4o', messages: [{role:'user',content:prompt}], temperature:0.75, max_tokens:1400 })
    });
    const data = await r.json();
    let inner = (data.choices?.[0]?.message?.content || '').replace(/```/g,'').trim();
    const code = `function ${fn}(){\n${inner}\n${fn==='checkout'?"setTimeout(()=>window.parent.postMessage('INSTALL_CLICK','*'),2800);":""}\n}`;
    res.json({ code });
  } catch(e) {
    res.json({ code: `function ${fn}(){}` });
  }
});

app.listen(PORT, () => console.log('Lynex 5D PRO running'));