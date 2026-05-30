const express = require('express');
const cors = require('cors');
const fs = require('fs');
const JSZip = require('jszip');
const morgan = require('morgan');
const winston = require('winston');
const { Octokit } = require('@octokit/rest');

const app = express();
const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENAI_KEY = process.env.OPENAI_API_KEY;
const octokit = GITHUB_TOKEN? new Octokit({ auth: GITHUB_TOKEN }) : null;

const REPO_OWNER = 'veeno7';
const REPO_NAME = 'projective-code-mvp';
const BRANCH = 'main';

// --- IMPROVEMENT 2: LOGGING ---
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console(), new winston.transports.File({ filename: 'lynex.log' })]
});
app.use(morgan('tiny'));
app.use((req,res,next)=>{ logger.info(`${req.method} ${req.path}`); next(); });

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static('public'));

// --- 5D STORE (unchanged) ---
const DEFAULTS = { /* your game code here — keep as is */ };
let store = {...DEFAULTS };
try { store = {...store,...JSON.parse(fs.readFileSync('./store.json','utf8')) }; } catch {}
const key = (x,y,z,w,v)=>`${x},${y},${z},${w},${v}`;
function projectAll(){ /* same */ }
projectAll();

// --- IMPROVEMENT 1: MODULARIZED GITHUB ---
const github = {
  async get(path){ const {data}=await octokit.repos.getContent({owner:REPO_OWNER,repo:REPO_NAME,path,ref:BRANCH}); return {code:Buffer.from(data.content,'base64').toString('utf8'),sha:data.sha}; },
  async put(path,code,sha,msg){ await octokit.repos.createOrUpdateFileContents({owner:REPO_OWNER,repo:REPO_NAME,path,branch:BRANCH,message:msg||`Update ${path}`,content:Buffer.from(code).toString('base64'),sha}); }
};

app.get('/health', (_,res)=>res.json({ok:true,version:'5d-improved'}));

// --- IMPROVEMENT 3: BETTER ERROR HANDLING ---
app.post('/api/agent/execute', async (req,res)=>{
  try {
    const {action,path,code,message}=req.body;
    const file = await github.get(path).catch(()=>({code:'',sha:null}));
    if(action==='smart_edit'){
      const prompt=`Edit ${path}. Current:\n${file.code}\n\nTask:${message}\nReturn full file only.`;
      const r=await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${OPENAI_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'user',content:prompt}],temperature:0})});
      const d=await r.json(); const newCode=d.choices[0].message.content.replace(/```[\w]*\n|```/g,'');
      await github.put(path,newCode,file.sha,'AI: '+message);
      logger.info(`Smart edit: ${path}`);
      return res.json({success:true});
    }
    res.json({success:false});
  } catch(e){
    logger.error(e.message);
    if(e.status===404) return res.status(404).json({error:'File not found on GitHub'});
    if(e.status===403) return res.status(403).json({error:'GitHub token invalid or rate limited'});
    res.status(500).json({error:'Server error: '+e.message});
  }
});

//... keep your /chat, /api/chat, /api/save etc. same as before...

app.listen(PORT, ()=>logger.info('Lynex improved running'));