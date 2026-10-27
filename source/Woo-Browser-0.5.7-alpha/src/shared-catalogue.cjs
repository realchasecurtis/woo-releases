'use strict';
// Curated operator metadata over HTTPS, not signed ownership or public claims.
const https=require('node:https');
const policy=require('./policy.cjs');
const {snapshot}=require('./registry.cjs');
const MAX_BYTES=256*1024, MAX_RECORDS=500, TIMEOUT_MS=6000;
function sourceURL(value){const u=new URL(policy.destination(value));if(u.search||u.hash)throw Error('Catalogue source cannot contain query or fragment');return u.href;}
function parseCatalogue(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length>MAX_BYTES)throw Error('Catalogue exceeds byte limit');
 const data=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>keys.includes(k));
 if(!exact(data,['version','records'])||data.version!==1||!Array.isArray(data.records)||data.records.length>MAX_RECORDS)throw Error('Invalid catalogue schema or count');
 for(const r of data.records){if(!exact(r,['name','destination','owner','note','title','description','aliases']))throw Error('Invalid catalogue record');}
 // Reuse the existing version 1 registry format and canonical name/URL policy.
 return snapshot(data).records;
}
async function fetchCatalogue(source,{signal,request=https.get,publicAddress=policy.publicAddress}={}){
 const url=new URL(sourceURL(source));signal?.throwIfAborted();
 const address=await publicAddress(url.hostname);signal?.throwIfAborted();
 if(!policy.publicIPv4(address))throw Error('Catalogue resolved to non-public address');
 return new Promise((resolve,reject)=>{
  let req,settled=false;
  const finish=(error,value)=>{if(settled)return;settled=true;signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);};
  const abort=()=>{const error=signal.reason||Error('Catalogue cancelled');finish(error);req?.destroy(error);};
  signal?.addEventListener('abort',abort,{once:true});
  try{req=request(url,{agent:false,headers:{Accept:'application/json, text/plain','Accept-Encoding':'identity'},lookup:(_host,opts,cb)=>opts.all?cb(null,[{address,family:4}]):cb(null,address,4)},res=>{
   // No redirect follow: source authority/path must stay exactly configured.
   const deny=message=>{const error=Error(message);finish(error);req.destroy(error);};
   if(res.statusCode!==200){deny('Catalogue unavailable (HTTP '+res.statusCode+'); redirects are not followed');return;}
   if(res.headers['content-encoding']&&res.headers['content-encoding']!=='identity'){deny('Encoded catalogue not supported');return;}
   const size=res.headers['content-length'];if(size!==undefined&&(!/^\d+$/.test(String(size))||Number(size)>MAX_BYTES)){deny('Catalogue exceeds byte limit');return;}
   let length=0;const chunks=[];
   res.on('data',chunk=>{if(settled)return;const b=Buffer.from(chunk);length+=b.length;if(length>MAX_BYTES){const error=Error('Catalogue exceeds byte limit');finish(error);req.destroy(error);}else chunks.push(b);});
   res.on('error',e=>finish(e));res.on('aborted',()=>finish(Error('Catalogue response interrupted')));
   res.on('end',()=>finish(null,Buffer.concat(chunks)));
  });req.on('error',e=>finish(e));if(signal?.aborted)abort();}catch(e){finish(e);}
 });
}
class SharedCatalogue{
 constructor({enabled=false,url='',transport=fetchCatalogue,timeoutMs=TIMEOUT_MS,onChange=()=>{}}={}){
  this.enabled=enabled===true;this.url=url?sourceURL(url):'';if(this.enabled&&!this.url)throw Error('Catalogue source required');
  if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>TIMEOUT_MS)throw Error('Invalid catalogue timeout');Object.assign(this,{transport,timeoutMs,onChange});this.records=[];this.state=this.enabled?'not loaded':'disabled';this.message='';this.closed=false;
 }
 list(){return this.records.map(r=>({...r,aliases:r.aliases?.slice()}));}
 get(name){return this.list().find(r=>r.name===policy.name(name));}
 status(){return {state:this.state,source:this.url,count:this.records.length,message:this.message,trust:'Operator-curated HTTPS catalogue; not signed ownership or global uniqueness'};}
 ensure(){return this.pending||(!this.attempted?this.refresh():Promise.resolve());}
 refresh(){
  if(this.pending)return this.pending;if(!this.enabled||this.closed)return Promise.resolve();
  this.attempted=true;this.state='loading';this.message='';this.onChange();const controller=this.controller=new AbortController();
  let timer;const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{const e=Error('Catalogue timed out');controller.abort(e);reject(e);},this.timeoutMs);});
  this.pending=Promise.race([Promise.resolve().then(()=>this.transport(this.url,{signal:controller.signal})),deadline]).then(bytes=>{controller.signal.throwIfAborted();this.records=parseCatalogue(bytes);this.state='ready';},e=>{throw e;}).catch(e=>{this.records=[];this.state='unavailable';this.message=e.message;}).finally(()=>{clearTimeout(timer);this.pending=null;this.controller=null;if(!this.closed)this.onChange();});
  return this.pending;
 }
 stop(){this.closed=true;this.controller?.abort(Error('Catalogue stopped'));}
}
// Native names win in main before resolution. Local aliases/builtins win here.
function visibleShared(catalogue,registry,hasNative=()=>false){return catalogue.list().filter(r=>!registry.get(r.name)&&!hasNative(r.name)&&!require('../sdk/namespace.cjs').isReserved(r.name));}
module.exports={SharedCatalogue,fetchCatalogue,parseCatalogue,sourceURL,visibleShared,MAX_BYTES,MAX_RECORDS,TIMEOUT_MS};
