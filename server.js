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
  "0,0,0,0.9,0": "function checkout(){ console.log('web'); }",
  "0,0,0,0.9,1": "function checkout(){ window.parent.postMessage('INSTALL_CLICK','*'); }",
  "1,0,0,0.9,1": "function init(){ }",
  "2,0,0,0.9,1": "function startGame(){ }"
};
let store = { ...DEFAULTS };
try { store = {...store, ...JSON.parse(fs.readFileSync('./store.json','utf8'))}; } catch {}

const key = (x,y,z,w,v) => `${x},${y},${z},${w},${v}`;

function projectAll() {
  fs.mkdirSync('./public',{recursive:true});
  const playable = [0,1,2].map(x=>store[key(x,0,0,0.9,1)]||'').join('\n\n');
  fs.writeFileSync('./public/playable.js', playable);

  // FIXED: using Three 0.145 where examples/js actually exists
  const demo = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lynex</title>
<style>body{margin:0;background:#000;overflow:hidden}canvas{display:block}#e{display:none;position:fixed;inset:0;background:#000;color:#f55;padding:20px;font:12px monospace;z-index:99}</style></head><body><div id="e"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.145.0/three.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/controls/OrbitControls.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/postprocessing/EffectComposer.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/postprocessing/RenderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/postprocessing/ShaderPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/shaders/CopyShader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/shaders/LuminosityHighPassShader.js"></script>
<script src="https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/postprocessing/UnrealBloomPass.js"></script>
<script src="https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js"></script>
<script>
onerror=(m,s,l)=>{e.style.display='block';e.textContent=m+'\\n'+s+':'+l};
var scene=new THREE.Scene();scene.background=new THREE.Color(0x050810);scene.fog=new THREE.Fog(0x050810,15,40);
var camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,100);camera.position.set(0,1.6,4.5);
var renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;document.body.appendChild(renderer.domElement);
var controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
scene.add(new THREE.HemisphereLight(0xffffff,0x222233,0.8));var sun=new THREE.DirectionalLight(0xffeedd,1.5);sun.position.set(5,8,4);sun.castShadow=true;scene.add(sun);
var ground=new THREE.Mesh(new THREE.PlaneGeometry(50,50),new THREE.MeshStandardMaterial({color:0x10141f,roughness:0.9}));ground.rotation.x=-1.57;ground.receiveShadow=true;scene.add(ground);
var composer=new THREE.EffectComposer(renderer);composer.addPass(new THREE.RenderPass(scene,camera));composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.6,0.4,0.85));
var world=new CANNON.World({gravity:new CANNON.Vec3(0,-9.82,0)});
window.scene=scene;window.camera=camera;window.renderer=renderer;window.THREE=THREE;window.CANNON=CANNON;window.world=world;
function loop(){requestAnimationFrame(loop);controls.update();world.step(1/60);composer.render()}loop();
var s=document.createElement('script');s.src='/playable.js?'+Date.now();document.body.appendChild(s);
</script></body></html>`;
  fs.writeFileSync('./public/demo.html', demo);
}
projectAll();

app.get('/api/project',(q,r)=>r.json({code:store[key(q.query.x||0,q.query.y||0,q.query.z||0,q.query.w||0.9,q.query.v||0)]||''}));
app.post('/api/save',async(q,r)=>{const b=q.body;store[key(b.x||0,b.y||0,b.z||0,b.w,b.v)]=b.code;fs.writeFileSync('./store.json',JSON.stringify(store));projectAll();r.json({ok:true})});
app.post('/api/generate',async(q,r)=>{try{const resp=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o',messages:[{role:'system',content:'Use window.scene, window.THREE. No imports. Output JS only.'},{role:'user',content:q.body.intent}],max_tokens:800})});const j=await resp.json();let code=j.choices[0].message.content.replace(/```/g,'');r.json({code:`function ${['checkout','init','startGame'][q.body.x]}(){try{${code}}catch(e){}}`})}catch(e){r.json({code:'function startGame(){}'})}});
app.use(express.static('.'));
app.listen(PORT);