const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let store = {};
try { store = JSON.parse(fs.readFileSync('./store.json')); } 
catch { store = {
  "0,0,0,0.9,0": "function checkout(){ return 'web version'; }",
  "0,0,0,0.9,1": "function checkout(){ return 'playable lite'; }",
  "0,0,0,0.3,0": "// intent: 1-tap checkout"
};}

const key = (x,y,z,w,v) => `${x},${y},${z},${w},${v}`;

app.get('/api/project', (req,res)=>{
  const w = parseFloat(req.query.w)||0.9;
  const v = parseInt(req.query.v)||0;
  const match = Object.keys(store).find(k=>{
    const [, , , kw, kv] = k.split(',').map(Number);
    return kv===v && Math.abs(kw-w)<0.2;
  });
  res.json({code: store[match] || '// empty', w, v});
});

app.post('/api/save', (req,res)=>{
  const {w,v,code} = req.body;
  store[key(0,0,0,w,v)] = code;
  fs.writeFileSync('./store.json', JSON.stringify(store,null,2));
  res.json({ok:true});
});

app.listen(PORT, ()=>console.log('running on '+PORT));
