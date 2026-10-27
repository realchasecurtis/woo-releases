'use strict';
const crypto=require('node:crypto'),https=require('node:https');
const policy=require('./policy.cjs');const fs=require('node:fs');const {atomic}=require('./registry.cjs');
function version(s){if(typeof s!=='string'||! /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/.test(s))throw Error('Invalid stable version');return s.split('.').map(Number);}
function compare(a,b){a=version(a);b=version(b);for(let i=0;i<3;i++)if(a[i]!==b[i])return Math.sign(a[i]-b[i]);return 0;}
function createTransport({request=https.get,resolveAddress=policy.publicAddress,timeout=15000}={}){return async function fetchBytes(url,limit=65536){
 const u=new URL(policy.destination(url));
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{reject(Error('Update request timed out'));req.destroy();},timeout);
  const req=request(u,{agent:false,lookup:(host,opts,cb)=>resolveAddress(host).then(ip=>opts.all?cb(null,[{address:ip,family:4}]):cb(null,ip,4),cb),headers:{'User-Agent':'Woo-Update/1'}},res=>{
   if(res.statusCode!==200){clearTimeout(timer);reject(Error('Update HTTP status '+res.statusCode));res.destroy();req.destroy();return;}
   let size=0;const chunks=[];res.on('data',b=>{size+=b.length;if(size>limit){clearTimeout(timer);reject(Error('Update size limit exceeded'));res.destroy();req.destroy();}else chunks.push(b);});res.on('end',()=>{clearTimeout(timer);resolve(Buffer.concat(chunks));});res.on('error',reject);
  });req.on('error',e=>{clearTimeout(timer);reject(e);});
 });
};}
const fetchBytes=createTransport();
function authenticate(bytes,config,now=Date.now()){
 if(crypto.createPublicKey(config.publicKey).asymmetricKeyType!=='ed25519')throw Error('Expected pinned Ed25519 release key');
 if(bytes.length>65536)throw Error('Manifest too large');const e=JSON.parse(bytes.toString('utf8'));
 if(typeof e.payload!=='string'||typeof e.signature!=='string'||!crypto.verify(null,Buffer.from(e.payload),config.publicKey,Buffer.from(e.signature,'base64')))throw Error('Manifest signature invalid');
 const m=JSON.parse(e.payload);version(m.version);
 if(m.schema!==1||m.product!==(config.product||'woo')||m.platform!==(config.platform||'win32-x64')||!Number.isSafeInteger(m.expires)||!Number.isSafeInteger(m.issued)||m.issued>now+300000||m.expires<=now||m.issued<0||m.expires<=m.issued||m.expires-m.issued>7*86400000)throw Error('Invalid or expired release metadata');
 if(!Number.isSafeInteger(m.size)||m.size<1||m.size>256*1024*1024||! /^[a-f0-9]{64}$/.test(m.sha256))throw Error('Invalid artifact metadata');
 const u=new URL(policy.destination(m.url));if(!config.downloadOrigins.includes(u.origin)||u.hash)throw Error('Untrusted download origin');return m;
}
class UpdateChecker{
 constructor({config,current,fetch=fetchBytes,clock=Date.now,changed=()=>{},floorFile}){this.floorFile=floorFile;this.config=config;this.current=current;version(current);this.fetch=fetch;this.clock=clock;this.changed=changed;this.next=0;this.failures=0;this.state={status:config?'idle':'not-configured',message:config?'Awaiting check':'Trusted release source not configured'};if(config&&floorFile){try{if(fs.existsSync(floorFile+'.initialized')&&!fs.existsSync(floorFile))throw Error('Update floor missing; restore trusted backup');if(fs.existsSync(floorFile)){if(fs.statSync(floorFile).size>8192)throw Error('Update floor too large');const raw=fs.readFileSync(floorFile,'utf8');if(!fs.existsSync(floorFile+'.initialized')||fs.readFileSync(floorFile+'.initialized','utf8')!==crypto.createHash('sha256').update(raw).digest('hex'))throw Error('Update floor rollback/conflict; restore matching trusted backup');const f=JSON.parse(raw);version(f.highest);if(f.version!==1||f.trust!==this.trustId()||typeof f.artifact!=='string')throw Error('Update floor conflicts with selected publisher');this.highest=f.highest;this.artifact=f.artifact;}}catch(e){this.floorError=e.message;}}}
 trustId(){return crypto.createHash('sha256').update(this.config.publicKey+'|'+(this.config.product||'woo')+'|'+(this.config.platform||'win32-x64')).digest('hex');}
 snapshot(){return {...this.state};}
 async check(){if(!this.config||this.busy||this.clock()<this.next)return this.snapshot();this.busy=true;this.state={status:'checking',message:'Checking authenticated releases'};this.changed();try{
 if(this.floorError)throw Error(this.floorError);const m=authenticate(await this.fetch(this.config.endpoint,65536),this.config,this.clock());
 if(this.highest&&compare(m.version,this.highest)<0)throw Error('Release rollback detected');const artifact=crypto.createHash('sha256').update(JSON.stringify([m.url,m.size,m.sha256])).digest('hex');if(this.highest===m.version&&this.artifact&&artifact!==this.artifact)throw Error('Release artifact equivocation');if(this.floorFile){atomic(this.floorFile,{version:1,trust:this.trustId(),highest:m.version,artifact});fs.writeFileSync(this.floorFile+'.initialized',crypto.createHash('sha256').update(fs.readFileSync(this.floorFile)).digest('hex'));}this.highest=m.version;this.artifact=artifact;this.release=compare(m.version,this.current)>0?m:null;this.failures=0;
 this.state={status:this.release?'available':'up-to-date',message:this.release?'Woo '+m.version+' available — download manually':'No newer authenticated release',version:m.version,checkedAt:this.clock()};this.next=this.clock()+6*3600000;
 }catch(e){this.release=null;this.state={status:'unavailable',message:'Update check unavailable: '+e.message};this.next=this.clock()+Math.min(6*3600000,60000*2**Math.min(this.failures++,9));}finally{this.busy=false;this.changed();}return this.snapshot();}
 async download(){if(!this.release)throw Error('No verified update available');const m=this.release;if(m.expires<=this.clock())throw Error('Release manifest expired; check again');const bytes=await this.fetch(m.url,m.size);if(bytes.length!==m.size||crypto.createHash('sha256').update(bytes).digest('hex')!==m.sha256)throw Error('Downloaded artifact verification failed');return {bytes,version:m.version};}
 start(){this.check();this.timer=setInterval(()=>this.check(),60000);this.timer.unref?.();}
 stop(){clearInterval(this.timer);}
}
module.exports={apiVersion:1,UpdateChecker,authenticate,compare,fetchBytes,createTransport};



