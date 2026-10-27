import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),crypto=require('../vendor/sdk/crypto.cjs'),host=require('../vendor/sdk/host.cjs'),{OwnershipRegistry}=require('../vendor/sdk/ownership.cjs');
export const LIMITS=Object.freeze({names:32,operations:64,siteBytes:1048576,bundleBytes:2097152,storageBytes:8388608,retained:8});
const clone=x=>structuredClone(x),digest=x=>crypto.hash(crypto.canonical(x));
const exact=(v,keys)=>{if(!v||Object.getPrototypeOf(v)!==Object.prototype||Object.keys(v).sort().join()!==[...keys].sort().join())throw Error('Invalid schema');};
const bounded=x=>{const text=crypto.canonical(x);if(Buffer.byteLength(text)>131072)throw Error('History size');return text;};
export function scopedName(label,publicKey){if(typeof label!=='string'||!/^[a-z][a-z0-9-]{0,30}[a-z0-9]$/.test(label))throw Error('Invalid test label');const f=crypto.fingerprint(publicKey);return `${label}.${f.slice(0,32)}.${f.slice(32)}.woo-test`;}
export function verifyHistory(history,expectedName){
 if(!Array.isArray(history)||!history.length||history.length>LIMITS.operations)throw Error('History limit');bounded(history);
 const first=history[0]?.payload;if(!first||first.name!==expectedName||scopedName(first.name.split('.')[0],first.publicKey)!==expectedName)throw Error('Scope/owner substitution');
 let now=first.issuedAt;const registry=new OwnershipRegistry({clock:()=>now,allowNewClaims:true,config:{maxAttempts:128,maxGlobalAttempts:128,maxUnobservedMs:Number.MAX_SAFE_INTEGER}});let record,revoked=false;
 for(let i=0;i<history.length;i++){
  const op=history[i],p=op?.payload;exact(op,['payload','signature']);if(!p||p.name!==expectedName||p.publicKey!==first.publicKey||p.generation!==1||!Number.isSafeInteger(p.issuedAt)||p.issuedAt<now||revoked)throw Error('Invalid history ordering');
  const base=['version','registry','issuedAt','action','name','publicKey','generation','sequence'];exact(p,p.action==='claim'?base:[...base,'root','revision']);now=p.issuedAt;
  if(i===0&&p.action!=='claim'||i>0&&!['update','revoke'].includes(p.action))throw Error('Invalid operation');
  if(p.action==='revoke'){if(!record||p.version!==1||p.registry!=='woo-local-lab-v1'||p.sequence!==record.sequence+1||p.root!==record.root||p.revision!==record.revision||!crypto.verify(op,p.publicKey))throw Error('Invalid revocation');record={...record,sequence:p.sequence,status:'revoked'};revoked=true;}
  else record=registry.apply(op);
 }
 return {record,revoked,digest:digest(history),length:history.length};
}
const MIME={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',json:'application/json',txt:'text/plain; charset=utf-8',png:'image/png',jpg:'image/jpeg',svg:'image/svg+xml'};
export function packageFiles(files,record,key,revision){
 if(!files||Object.getPrototypeOf(files)!==Object.prototype||Object.keys(files).length>64)throw Error('File count');const stored={};let total=0;
 for(const [p,v]of Object.entries(files)){const ext=p.split('.').at(-1);if(!/^\/[a-zA-Z0-9/_-]+\.[a-zA-Z0-9]+$/.test(p)||p.includes('//')||p.length>=200||!MIME[ext]||!(typeof v==='string'||Buffer.isBuffer(v)||v instanceof Uint8Array))throw Error('Unsafe file');const b=Buffer.from(v);total+=b.length;if(total>LIMITS.siteBytes)throw Error('Site size');stored[p]={mime:MIME[ext],sha256:crypto.hash(b),data:b.toString('base64')};}
 const entries=Object.fromEntries(Object.entries(stored).map(([p,f])=>[p,{mime:f.mime,sha256:f.sha256}]));const bundle={manifest:crypto.sign({version:1,name:record.name,owner:crypto.fingerprint(key.publicKey),generation:1,revision,entries},key.privateKey),files:stored};
 const root=host.bundleRoot(bundle);verifyContent(bundle,{...record,root,revision});return {bundle,root,bytes:Buffer.from(crypto.canonical(bundle))};
}
function verifyContent(bundle,record){const encoded=Buffer.from(crypto.canonical(bundle));if(encoded.length>LIMITS.bundleBytes)throw Error('Bundle size');exact(bundle,['manifest','files']);exact(bundle.manifest,['payload','signature']);exact(bundle.manifest.payload,['version','name','owner','generation','revision','entries']);const files=host.verifyBundle(bundle,record);if(Object.keys(bundle.files).sort().join()!==[...files.keys()].sort().join())throw Error('Unlisted files');let total=0;for(const [p,f]of files){exact(bundle.files[p],['mime','sha256','data']);exact(bundle.manifest.payload.entries[p],['mime','sha256']);if(f.bytes.toString('base64')!==bundle.files[p].data)throw Error('Noncanonical data');total+=f.bytes.length;}if(total>LIMITS.siteBytes)throw Error('Site size');return files;}
export function createMemoryProvider(){
 const histories=new Map(),blobs=new Map();let bytes=0;
 return Object.freeze({
  async list(){return [...histories.keys()].sort();},async read(n){const h=histories.get(n);if(!h)throw Error('Missing name');return clone(h);},async readBlob(root){const b=blobs.get(root);if(!b)throw Error('Missing content');return Buffer.from(b);},
  async putBlob(root,value){if(!Buffer.isBuffer(value)||value.length>LIMITS.bundleBytes)throw Error('Blob limit');const b=JSON.parse(value.toString());if(host.bundleRoot(b)!==root||!Buffer.from(crypto.canonical(b)).equals(value))throw Error('Blob/root mismatch');if(blobs.has(root)){if(!blobs.get(root).equals(value))throw Error('Blob conflict');return;}if(bytes+value.length>LIMITS.storageBytes||blobs.size>=128)throw Error('Storage quota');blobs.set(root,Buffer.from(value));bytes+=value.length;},
  async append(n,expected,op){const old=histories.get(n)||[];if((old.length?digest(old):null)!==expected)throw Error('History conflict');if(!histories.has(n)&&histories.size>=LIMITS.names)throw Error('Name quota');const next=[...old,clone(op)],verified=verifyHistory(next,n);if(op.payload.action==='update'&&!blobs.has(verified.record.root))throw Error('Missing content');histories.set(n,next);return verified.digest;},
  status:()=>({names:histories.size,blobs:blobs.size,bytes,persistent:false})
 });
}
export function createPublisher({provider,key,label,publicTestContent=false,clock=Date.now}){
 if(publicTestContent!==true)throw Error('Explicit public test content consent required');const name=scopedName(label,key.publicKey);let history=[],busy=false;
 async function commit(action,extra={}){const op=crypto.sign({version:1,registry:'woo-local-lab-v1',issuedAt:clock(),action,name,publicKey:key.publicKey,generation:1,sequence:history.length+1,...extra},key.privateKey);await provider.append(name,history.length?digest(history):null,op);history.push(op);return verifyHistory(history,name).record;}
 async function serial(fn){if(busy)throw Error('Publication pending');busy=true;try{return await fn();}finally{busy=false;}}
 return Object.freeze({name,create:()=>serial(()=>{if(history.length)throw Error('Already created');return commit('claim');}),publish:files=>serial(async()=>{const v=verifyHistory(history,name);if(v.revoked)throw Error('Revoked');const packed=packageFiles(files,v.record,key,v.record.revision+1);await provider.putBlob(packed.root,packed.bytes);return commit('update',{root:packed.root,revision:v.record.revision+1});}),revoke:()=>serial(()=>{const v=verifyHistory(history,name);if(v.revoked)throw Error('Revoked');return commit('revoke',{root:v.record.root,revision:v.record.revision});})});
}
export function createClient({provider}){
 const pins=new Map(),retained=new Map();let retainedBytes=0;
 function remember(name,history){const v=verifyHistory(history,name),old=pins.get(name);if(old?.conflict)throw Error('Quarantined conflicting history');if(old&&history.length<old.length)throw Error('Rollback history');if(old&&digest(history.slice(0,old.length))!==old.digest){old.conflict=true;throw Error('Conflicting history');}if(!old&&pins.size>=LIMITS.names)throw Error('Trust capacity');pins.set(name,{length:v.length,digest:v.digest,revoked:v.revoked});if(v.revoked){const saved=retained.get(name);if(saved){retainedBytes-=saved.exportBytes.length;retained.delete(name);}throw Error('Revoked');}return v.record;}
 function opened(record,bytes){if(!Buffer.isBuffer(bytes)||bytes.length>LIMITS.bundleBytes)throw Error('Bundle limit');const bundle=JSON.parse(bytes.toString());const files=verifyContent(bundle,record);return {record:clone(record),bundle:clone(bundle),files,exportBytes:Buffer.from(crypto.canonical(bundle)),renderPolicy:'Use Browser NativeRenderer sandbox; never execute in trusted UI'};}
 return Object.freeze({
  async search(query){if(typeof query!=='string'||query.length>128)throw Error('Search limit');const list=await provider.list();if(!Array.isArray(list)||list.length>LIMITS.names||list.some(n=>typeof n!=='string'||n.length>253)||new Set(list).size!==list.length)throw Error('Catalogue limit');const out=[];for(const n of list){if(!n.includes(query.toLowerCase()))continue;try{const v=verifyHistory(await provider.read(n),n);if(!v.revoked)out.push({name:n,scope:'self-certifying-test',trusted:false});}catch{}}return out;},
  async resolve(name){return remember(name,await provider.read(name));},
  async open(name,{retain=false}={}){if(typeof retain!=='boolean')throw Error('Retention consent');const record=remember(name,await provider.read(name));if(!record.root)throw Error('No publication');const result=opened(record,await provider.readBlob(record.root));const current=pins.get(name);if(current.revoked)throw Error('Revoked during fetch');const history=await provider.read(name);const latest=remember(name,history);if(latest.root!==record.root||latest.sequence!==record.sequence)throw Error('Changed during fetch');if(retain){const old=retained.get(name),size=retainedBytes-(old?.exportBytes.length||0)+result.exportBytes.length;if((!old&&retained.size>=LIMITS.retained)||size>LIMITS.storageBytes)throw Error('Retention quota');retained.set(name,{record:clone(record),exportBytes:Buffer.from(result.exportBytes)});retainedBytes=size;}return result;},
  offline(name){const r=retained.get(name);if(!r||(pins.get(name)?.revoked||pins.get(name)?.conflict))throw Error('No retained snapshot');return {...opened(r.record,r.exportBytes),freshness:'retained snapshot; latest status unknown offline'};},
  forgetRetained(name){const old=retained.get(name);if(old)retainedBytes-=old.exportBytes.length;retained.delete(name);},status:()=>({trustedNames:pins.size,retained:retained.size,retainedBytes,persistent:false})
 });
}

