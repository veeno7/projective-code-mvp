const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- YOUR EXISTING 5D STORE (kept) ---
const DEFAULTS = {
  "0,0,0,0.9,0": "function checkout(){ console.log('web version'); }",
  "0,0,0,0.9,1": "function checkout(){\n  console.log('playable CTA from 5D');\n  window.parent.postMessage('INSTALL_CLICK','*');\n}",
  "1,0,0,0.9,1": "function init(){ console.log('init playable'); }",
  "2,0,0,0.9,1": "function startGame(){ console.log('game start'); }"
};

let store = {...DEFAULTS};
try {
  const saved = JSON.parse(fs.readFileSync('./store.json','utf8'));
  store = {...store, ...saved}; // keep anything you saved before
} catch(e){}

const key = (x,y,z,w,v) => `${x},${y},${z},${w},${v}`;

// --- projector (now builds full playable.js from all x) ---
function projectAll(){
  fs.mkdirSync('./public',{recursive:true});
  const playable = [0,1,2].map(x => store[key(x,0,0,0.9,1)] || '').join('\n\n');
  fs.writeFileSync('./public/playable.js', playable);
  fs.writeFileSync('./public/web.js', store[key(0,0,0,0.9,0)] || '');
}
projectAll();

app.get('/api/project', (req,res)=>{
  const x = parseInt(req.query.x)||0;
  const w = parseFloat(req.query.w)||0.9;
  const v = parseInt(req.query.v)||0;
  res.json({ code: store[key(x,0,0,w,v)] || '// empty', x, w, v });
});

app.post('/api/save', (req,res)=>{
  const {x,w,v,code} = req.body;
  store[key(x,0,0,w,v)] = code;
  try { fs.writeFileSync('./store.json', JSON.stringify(store,null,2)); } catch(e){}
  projectAll();
  res.json({ok:true});
});

app.listen(PORT, ()=>console.log('Lynex 5D running'));