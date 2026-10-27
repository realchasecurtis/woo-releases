'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {hash,canonical,sign,verify,fingerprint}=require('./crypto.cjs');
const {name}=require('../src/policy.cjs');
const MIME={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.txt':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml'};
function safePath(p){return typeof p==='string'&&/^\/[a-zA-Z0-9/_-]+\.[a-zA-Z0-9]+$/.test(p)&&!p.includes('//')&&p.length<200;}
function buildBundle(directory,record,key,revision=1){
 const root=fs.realpathSync(directory),files={};let total=0;
 function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,item.name);if(item.isSymbolicLink())throw Error('Host content cannot contain symlinks');if(item.isDirectory()){walk(f);continue;}if(!item.isFile())throw Error('Unsupported content entry');const rel='/'+path.relative(root,f).split(path.sep).join('/');if(!safePath(rel)||!MIME[path.extname(rel)])throw Error('Unsupported content path '+rel);const size=fs.statSync(f).size;if(size>1024*1024||total+size>4*1024*1024)throw Error('Content size limit');const bytes=fs.readFileSync(f);total+=bytes.length;files[rel]={mime:MIME[path.extname(rel)],sha256:hash(bytes),data:bytes.toString('base64')};if(Object.keys(files).length>64)throw Error('Too many files');}}
 walk(root);if(!files['/index.html'])throw Error('index.html required');
 const entries=Object.fromEntries(Object.entries(files).map(([p,f])=>[p,{mime:f.mime,sha256:f.sha256}]));
 const payload={version:1,name:record.name,owner:fingerprint(key.publicKey),generation:record.generation,revision,entries};
 return {manifest:sign(payload,key.privateKey),files};
}
function bundleRoot(bundle){return hash(canonical(bundle.manifest.payload));}
function verifyBundle(bundle,record){
 const p=bundle?.manifest?.payload;if(!p||p.version!==1||p.name!==name(record.name)||p.owner!==fingerprint(record.publicKey)||p.generation!==record.generation||p.revision!==record.revision||bundleRoot(bundle)!==record.root||!verify(bundle.manifest,record.publicKey))throw Error('Content signature, identity or pinned revision mismatch');
 if(!p.entries||Object.keys(p.entries).length>64||!p.entries['/index.html'])throw Error('Invalid manifest');const files=new Map();let total=0;
 for(const [entry,meta]of Object.entries(p.entries)){const f=bundle.files?.[entry];if(!safePath(entry)||!f||typeof f.data!=='string'||f.data.length>1400000||meta.mime!==MIME[path.extname(entry)]||f.mime!==meta.mime||f.sha256!==meta.sha256)throw Error('Malformed file');const bytes=Buffer.from(f.data,'base64');total+=bytes.length;if(total>4*1024*1024||hash(bytes)!==meta.sha256)throw Error('Content hash mismatch');files.set(entry,{bytes,mime:meta.mime});}return files;
}
async function startHost(){throw Error('Loopback bundle HTTP adapter removed; pass signed bundles directly to verifyBundle');}
async function readLocalHost(){throw Error('Loopback bundle HTTP adapter removed');}
function planConnection({directReachable=false,relayAllowed=false}={}){return directReachable?{mode:'direct-simulation',implemented:false}:relayAllowed?{mode:'relay-simulation',implemented:false}:{mode:'unreachable',implemented:false,reason:'No public transport or relay deployed'};}
module.exports={buildBundle,bundleRoot,verifyBundle,startHost,readLocalHost,planConnection};
