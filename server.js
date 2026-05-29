const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- SEED THE 5D STORE IN MEMORY ---
const DEFAULTS = {
  "0,0,0,0.9,0": "function checkout(){ console.log('web version'); }",
  "0,0,0,0.9,1": "function checkout(){ console.log('playable version'); }",
  "0,0,0,0.3,0": "// intent: 1-tap checkout for high CVR"
};
let store = {...DEFAULTS};
try {
  const saved = JSON.parse(fs.readFileSync('./store.json','utf8'));
  store = {...store,...saved}; // merge if file exists
} catch(e){}

const key = (x,y,z,w,v) => `${x},${y},${z},${w},${v}`;

function projectAll(){
  fs.mkdirSync('./public',{recursive:true});
  fs.writeFileSync('./public/web.js', store[key(0,0,0,0.9,0)]);
  fs.writeFileSync('./public/playable.js', store[key(0,0,0,0.9,1)]);
}
projectAll();

app.get('/api/project', (req,res)=>{
  const w = parseFloat(req.query.w)||0.9;
  const v = parseInt(req.query.v)||0;
  const k = key(0,0,0,w,v);
  res.json({code: store[k] || '// empty', w, v});
});

app.post('/api/save', (req,res)=>{
  const {w,v,code} = req.body;
  store[key(0,0,0,w,v)] = code;
  try { fs.writeFileSync('./store.json', JSON.stringify(store,null,2)); } catch(e){}
  projectAll();
  res.json({ok:true});
});

app.listen(PORT, ()=>console.log('Lynex 5D running'));