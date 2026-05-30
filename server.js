const express = require('express');
const cors = require('cors');
const fs = require('fs');
const JSZip = require('jszip');
const { Octokit } = require('@octokit/rest');

const app = express();
const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const octokit = GITHUB_TOKEN? new Octokit({ auth: GITHUB_TOKEN }) : null;

const REPO_OWNER = 'veeno7';
const REPO_NAME = 'projective-code-mvp';
const BRANCH = 'main';

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static('public'));

// --- ADVANCED 5D STORE WITH FIRE-SPREADING GAME ---
const DEFAULTS = {
  "0,0,0,0.9,0": "function checkout(){ console.log('web'); }",
  "0,0,0,0.9,1": "function checkout(){ window.parent.postMessage('INSTALL_CLICK','*'); }",
  "1,0,0,0.9,1": "function init(){ window.gameState={taps:0,fireScale:0.5}; }",
  "2,0,0,0.9,1": "function startGame(){ scene.children.filter(c=>c.userData?.fire).forEach(c=>scene.remove(c)); const fireGroup=new THREE.Group();fireGroup.userData.fire=true;fireGroup.userData.scale=0.5; const createParticle=()=>{const geo=new THREE.SphereGeometry(0.06,8,8);const mat=new THREE.MeshBasicMaterial({color:new THREE.Color().setHSL(0.07-Math.random()*0.04,1,0.6),transparent:true,opacity:0.9});const p=new THREE.Mesh(geo,mat);p.position.set((Math.random()-0.5)*fireGroup.userData.scale,(Math.random()-0.3)*0.2,(Math.random()-0.5)*fireGroup.userData.scale);p.userData={vy:0.012+Math.random()*0.018,life:0};return p;};for(let i=0;i<60;i++)fireGroup.add(createParticle());scene.add(fireGroup);const light=new THREE.PointLight(0xff5500,2,6);light.position.set(0,0.6,0);light.userData.fire=true;scene.add(light);let growInterval=setInterval(()=>{if(fireGroup.userData.scale<2.2){fireGroup.userData.scale+=0.15;fireGroup.children.forEach(p=>{if(Math.random()<0.3)fireGroup.add(createParticle())});light.intensity=1.8+fireGroup.userData.scale*0.4;}else clearInterval(growInterval);},800);const tapHandler=(e)=>{const taps=++window.gameState.taps;fireGroup.userData.scale=Math.max(0.3,fireGroup.userData.scale-0.4);fireGroup.children.slice(0,15).forEach(p=>{p.material.opacity*=0.5;p.userData.vy*=1.5});if(taps>=3){clearInterval(growInterval);renderer.domElement.removeEventListener('pointerdown',tapHandler);setTimeout(()=>checkout(),400);}};renderer.domElement.addEventListener('pointerdown',tapHandler);const animate=()=>{fireGroup.children.forEach(p=>{p.position.y+=p.userData.vy;p.userData.life+=0.015;p.material.opacity=Math.max(0,0.9-p.userData.life*0.4);p.scale.setScalar(1+p.userData.life*0.3);if(p.position.y>2.2||p.material.opacity<=0){p.position.y=0;p.position.set((Math.random()-0.5)*fireGroup.userData.scale,0,(Math.random()-0.5)*fireGroup.userData.scale);p.userData.life=0;p.material.opacity=0.9;}});light.intensity=1.5+Math.sin(Date.now()*0.008)*0.6+fireGroup.userData.scale*0.3;requestAnimationFrame(animate);};animate(); }",
};

let store = {...DEFAULTS };
try { store = {...store,...JSON.parse(fs.readFileSync('./store.json','utf8')) }; } catch {}
Object.keys(DEFAULTS).forEach(k => store[k] = DEFAULTS[k]);

const key = (x,y,z,w,v)=>`${x},${y},${z},${w},${v}`;

function projectAll(){
  fs.mkdirSync('./public',{recursive:true});
  const playable = [0,1,2].map(x=>store[key(x,0,0,0.9,1)]||'').join('\n\n');
  fs.writeFileSync('./public/playable.js', playable);
  fs.writeFileSync('./public/web.js', store[key(0,0,0,0.9,0)]||'');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"><title>Lynex 5D</title><style>html,body{margin:0;height:100%;background:#000;overflow:hidden;touch-action:none}canvas{display:block}#ui{position:fixed;top:20px;left:50%;transform:translateX(-50%);color:#fff;font-family:system-ui;text-align:center;z-index:10}#cta{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);z-index:20}#btn{padding:18px 36px;font-size:20px;background:linear-gradient(135deg,#7c5cff,#5a3fd6);color:#fff;border:0;border-radius:14px}</style></head><body><div id="cta"><button id="btn">TAP TO EXTINGUISH</button></div><div id="ui"><div>Tap the fire 3 times!</div></div><script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.145.0/three.min.js"></script><script src="https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/controls/OrbitControls.js"></script><script src="https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/postprocessing/EffectComposer.js"></script><script src="https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/postprocessing/RenderPass.js"></script><script src="https://cdn.jsdelivr.net/npm/three@0.145.0/examples/js/postprocessing/UnrealBloomPass.js"></script><script src="https://cdnjs.cloudflare.com/ajax/libs/cannon.js/0.6.2/cannon.min.js"></script><script>window.scene=new THREE.Scene();scene.background=new THREE.Color(0);window.camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,0.1,100);camera.position.set(0,1.4,3.2);window.renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,2));document.body.appendChild(renderer.domElement);scene.add(new THREE.HemisphereLight(0x332211,0x000000,0.6));const dl=new THREE.DirectionalLight(0xffaa66,0.8);dl.position.set(3,5,2);scene.add(dl);window.controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enablePan=false;let composer;try{composer=new THREE.EffectComposer(renderer);composer.addPass(new THREE.RenderPass(scene,camera));composer.addPass(new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),0.7,0.5,0.8));}catch(e){}window.world=new CANNON.World();world.gravity.set(0,-9.82,0);const plane=new THREE.Mesh(new THREE.CircleGeometry(5,32),new THREE.MeshStandardMaterial({color:0x111111,roughness:1}));plane.rotation.x=-Math.PI/2;plane.position.y=-0.01;scene.add(plane);function loop(){requestAnimationFrame(loop);controls.update();world.step(1/60);composer?composer.render():renderer.render(scene,camera)}loop();const s=document.createElement('script');s.src='/playable.js?v='+Date.now();s.onload=()=>{try{init()}catch(e){}};document.body.appendChild(s);document.getElementById('btn').onclick=()=>{document.getElementById('cta').style.display='none';try{startGame()}catch(e){}};addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer&&composer.setSize(innerWidth,innerHeight)});</script></body></html>`;
  fs.writeFileSync('./public/demo.html', html);
}
projectAll();

async function ghGet(path){ const {data}=await octokit.repos.getContent({owner:REPO_OWNER,repo:REPO_NAME,path,ref:BRANCH}); return {code:Buffer.from(data.content,'base64').toString('utf8'), sha:data.sha}; }
async function ghPut(path,code,sha,msg){ await octokit.repos.createOrUpdateFileContents({owner:REPO_OWNER,repo:REPO_NAME,path,branch:BRANCH,message:msg||`Update ${path}`,content:Buffer.from(code).toString('base64'),sha}); }
async function ghHistory(path,limit=10){ const {data}=await octokit.repos.listCommits({owner:REPO_OWNER,repo:REPO_NAME,path,per_page:limit}); return data.map(c=>({sha:c.sha,message:c.commit.message,date:c.commit.author.date,author:c.commit.author.name})); }

app.get('/health',(_,res)=>res.json({ok:true,uptime:process.uptime(),github:!!octokit,version:'5d-agent'}));

app.get('/api/project',(req,res)=>{ const {x=0,y=0,z=0,w=0.9,v=0}=req.query; res.json({code:store[key(+x,+y,+z,+w,+v)]||''}); });
app.post('/api/save',async(req,res)=>{ const {x,y,z,w,v,code}=req.body; store[key(x||0,y||0,z||0,w,v)]=code; fs.writeFileSync('./store.json',JSON.stringify(store,null,2)); projectAll(); if(octokit){ try{ const {sha}=await ghGet('store.json').catch(()=>({sha:null})); await ghPut('store.json',JSON.stringify(store,null,2),sha,'5D save'); }catch{} } res.json({ok:true}); });

app.get('/api/github/read',async(req,res)=>{ try{ res.json(await ghGet(req.query.path||'server.js')); }catch(e){res.status(500).json({error:e.message});} });
app.post('/api/github/write',async(req,res)=>{ try{ const {path,code,sha,message}=req.body; if(path==='server.js'){ try{ const old=await ghGet(path); await ghPut(`backups/${Date.now()}-server.js`,old.code,null,'backup'); }catch{} } await ghPut(path,code,sha,message); res.json({ok:true,deploying:true}); }catch(e){res.status(500).json({error:e.message});} });
app.get('/api/history',async(req,res)=>{ try{ res.json(await ghHistory(req.query.path||'server.js')); }catch(e){res.status(500).json({error:e.message});} });
app.post('/api/rollback',async(req,res)=>{ try{ const {path,commitSha}=req.body; const {data}=await octokit.repos.getContent({owner:REPO_OWNER,repo:REPO_NAME,path,ref:commitSha}); await ghPut(path,Buffer.from(data.content,'base64').toString('utf8'),(await ghGet(path)).sha,`Rollback to ${commitSha.slice(0,7)}`); res.json({ok:true}); }catch(e){res.status(500).json({error:e.message});} });

// --- NEW: AUTO-PUSH (no SHA needed) ---
app.post('/api/push',async(req,res)=>{ try{ const {path,code,message}=req.body; const existing=await ghGet(path).catch(()=>({sha:null})); if(path==='server.js'){ try{ const old=await ghGet(path); await ghPut(`backups/${Date.now()}-server.js`,old.code,null,'auto-backup'); }catch{} } await ghPut(path,code,existing.sha,message||'lynex auto-push'); res.json({ok:true,auto:true}); }catch(e){res.status(500).json({error:e.message});} });

// --- NEW: AI AGENT CONTROLLER (saves OpenAI tokens) ---
app.post('/api/agent/execute',async(req,res)=>{ const start=Date.now(); try{ const {action,path,code,message}=req.body; let result={}; switch(action){ case 'read_file': const f=await ghGet(path); result={success:true,path,content:f.code,sha:f.sha}; break; case 'write_file': const ex=await ghGet(path).catch(()=>({sha:null})); await ghPut(path,code,ex.sha,message||'Agent write'); result={success:true,path,committed:true}; break; case 'list_files': const {data}=await octokit.repos.getContent({owner:REPO_OWNER,repo:REPO_NAME,path:path||'',ref:BRANCH}); result={success:true,files:data.map(f=>({name:f.name,path:f.path,type:f.type}))}; break; case 'get_status': const commits=await octokit.repos.listCommits({owner:REPO_OWNER,repo:REPO_NAME,per_page:5}); result={success:true,uptime:process.uptime(),last:commits.data.map(c=>c.commit.message)}; break; case 'run_project': projectAll(); result={success:true,rebuilt:true}; break; default: result={success:false,error:'unknown'}; } res.json({...result,time_ms:Date.now()-start}); }catch(e){res.status(500).json({success:false,error:e.message});} });

app.post('/api/ai/generate',async(req,res)=>{ if(!OPENAI_KEY) return res.json({code:'// no key'}); const {prompt,x=2}=req.body; const fn=['checkout','init','startGame'][x]; try{ const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${OPENAI_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o',messages:[{role:'system',content:'You write Three.js game code. Return ONLY javascript inside function.'},{role:'user',content:prompt}],temperature:0.8})}); const data=await r.json(); let inner=(data.choices[0]?.message?.content||'').replace(/```.*?\n|```/gs,''); const code=`function ${fn}(){${inner}}`; res.json({code}); }catch(e){res.json({code:`function ${fn}(){}`});} });

app.get('/export/playable.zip',async(_,res)=>{ projectAll(); const zip=new JSZip(); zip.file('index.html',fs.readFileSync('./public/demo.html')); zip.file('playable.js',fs.readFileSync('./public/playable.js')); res.set('Content-Type','application/zip').send(await zip.generateAsync({type:'nodebuffer'})); });

app.listen(PORT,()=>console.log(`Lynex 5D v2 running on ${PORT}`));