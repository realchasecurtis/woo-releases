'use strict';
const {name}=require('../src/policy.cjs');
const {fingerprint,verify,hash,canonical}=require('./crypto.cjs');
const DAY=86400000,MAX_RECORDS=2000,MAX_EVENTS=512,MAX_RATE_SUBJECTS=2000;
function addMonths(time,months){const d=new Date(time),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);const end=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,end));return d.getTime();}
class OwnershipRegistry {
 constructor({clock=Date.now,config={},allowNewClaims=false}={}){
  this.allowNewClaims=allowNewClaims===true;this.clock=clock;this.config={inactiveMonths:12,graceMs:30*DAY,warningMs:30*DAY,maxClaims:3,rateWindowMs:DAY,maxAttempts:12,maxGlobalAttempts:1000,maxUnobservedMs:120000,...config};
  for(const [k,v]of Object.entries(this.config))if(!Number.isSafeInteger(v)||v<1)throw Error('Invalid policy '+k);
  if(this.config.maxGlobalAttempts>10000||this.config.maxAttempts>10000||this.config.maxClaims>MAX_RECORDS)throw Error('Policy exceeds checkpoint capacity');
  this.records=new Map();this.generations=new Map();this.attempts=new Map();this.globalAttempts=[];this.available=true;this.pauseReason=null;this.lastWall=clock();this.time=this.lastWall;this.events=[];this.compactedEvents=0;
 }
 event(e){this.events.push(e);if(this.events.length>MAX_EVENTS){const count=this.events.length-MAX_EVENTS;this.events.splice(0,count);this.compactedEvents+=count;}}
 now(){const wall=this.clock(),delta=wall-this.lastWall;this.lastWall=wall;
  if(!Number.isSafeInteger(wall)||delta<0){this.available=false;this.pauseReason='clock-rollback';throw Error('Clock moved backwards; ownership paused');}
  if(this.available&&delta>this.config.maxUnobservedMs){this.available=false;this.pauseReason='unobserved-time';this.event({type:'unknown-time-paused',time:this.time,ignoredMs:delta});}
  else if(this.available)this.time+=delta;return this.time;
 }
 setAvailable(value){this.now();this.available=Boolean(value);this.pauseReason=value?null:'operator-paused';this.event({type:value?'operator-resumed':'registry-paused',time:this.time});}
 requireAvailable(){this.now();if(!this.available)throw Error('Registry unavailable (paused): '+this.pauseReason+'; explicit operator resume required');}
 maintain(){const now=this.now();if(!this.available)return;for(const r of this.records.values()){
  if(r.status==='released'||r.status==='release-pending')continue;
  if(r.status==='grace'&&now>=r.graceUntil){r.status='release-pending';this.event({type:'operator-release-confirmation-required',name:r.name,time:now,generation:r.generation});continue;}
  const due=addMonths(r.lastActivity,this.config.inactiveMonths);
  if(now>=due&&r.status==='active'){r.status='grace';r.graceUntil=now+this.config.graceMs;this.event({type:'final-recovery-warning',name:r.name,time:now,until:r.graceUntil});}
  else if(now>=due-this.config.warningMs&&!r.warned){r.warned=true;this.event({type:'advance-warning',name:r.name,time:now,due});}
 }}
 challenge(){this.requireAvailable();return {version:1,registry:'woo-local-lab-v1',issuedAt:this.time};}
 apply(envelope){this.requireAvailable();this.maintain();const p=envelope?.payload;if(!p||p.version!==1||p.registry!=='woo-local-lab-v1'||!['claim','confirm','checkin','update'].includes(p.action))throw Error('Invalid signed operation');
  const n=name(p.name);if(n!==p.name||typeof p.publicKey!=='string'||p.publicKey.length>256)throw Error('Invalid identity');const owner=fingerprint(p.publicKey);
  if(!Number.isSafeInteger(p.issuedAt)||Math.abs(this.time-p.issuedAt)>5*60000||!Number.isSafeInteger(p.sequence)||p.sequence<1)throw Error('Stale operation or invalid sequence');
  if(!verify(envelope,p.publicKey))throw Error('Invalid owner signature');
  for(const [id,times]of this.attempts){const live=times.filter(t=>t>this.time-this.config.rateWindowMs);if(live.length)this.attempts.set(id,live);else this.attempts.delete(id);}
  this.globalAttempts=this.globalAttempts.filter(t=>t>this.time-this.config.rateWindowMs);
  if(this.globalAttempts.length>=this.config.maxGlobalAttempts)throw Error('Registry rate limit exceeded');
  if(!this.attempts.has(owner)&&this.attempts.size>=MAX_RATE_SUBJECTS)throw Error('Rate subject capacity reached');
  const attempts=this.attempts.get(owner)||[];if(attempts.length>=this.config.maxAttempts)throw Error('Owner rate limit exceeded');
  this.globalAttempts.push(this.time);attempts.push(this.time);this.attempts.set(owner,attempts);
  let r=this.records.get(n);
  if(p.action==='claim'){if(!this.allowNewClaims)throw Error('Domain creation is temporarily closed. Existing sites remain readable.');require('./namespace.cjs').assertClaimable(n);
   if(r&&r.status!=='released')throw Error('Name already claimed');
   if(!r&&this.records.size>=MAX_RECORDS)throw Error('Registry record capacity reached; checkpoint remains bounded');
   if([...this.records.values()].filter(x=>x.owner===owner&&x.status!=='released').length>=this.config.maxClaims)throw Error('Free claim limit exceeded');
   if(p.sequence!==1)throw Error('Initial sequence must be 1');const generation=(this.generations.get(n)||0)+1;if(p.generation!==generation)throw Error('Wrong generation');
   r={name:n,owner,publicKey:p.publicKey,generation,sequence:1,lastActivity:this.time,status:'active',warned:false,root:null,revision:0};this.records.set(n,r);this.generations.set(n,generation);
  }else{
   if(!r||r.status==='released'||r.owner!==owner||r.generation!==p.generation)throw Error('Owner/generation mismatch or released name');
   if(p.sequence!==r.sequence+1)throw Error('Replay or out-of-order operation');
   if(p.action==='update'){if(typeof p.root!=='string'||!/^[a-f0-9]{64}$/.test(p.root)||p.revision!==r.revision+1)throw Error('Invalid content revision');r.root=p.root;r.revision=p.revision;}
   r.sequence=p.sequence;r.lastActivity=this.time;r.status='active';r.warned=false;delete r.graceUntil;
  }
  this.event({type:p.action,name:n,time:this.time,owner,generation:r.generation,sequence:r.sequence});return structuredClone(r);
 }
 resolve(n){this.requireAvailable();this.maintain();return this.inspect(n);}
 finalizeRelease(n,{confirmed=false,expectedGeneration,expectedOwner}={}){this.requireAvailable();this.maintain();const r=this.records.get(name(n));if(!confirmed||!r||r.status!=='release-pending'||r.generation!==expectedGeneration||r.owner!==expectedOwner)throw Error('Explicit matching operator release confirmation required');r.status='released';this.event({type:'operator-confirmed-release',name:r.name,time:this.time,generation:r.generation});}
 inspect(n){const r=this.records.get(name(n));if(!r||r.status==='released')throw Error('Name not active');return structuredClone(r);}
 export(){this.now();return {version:1,mode:'ephemeral-local-lab',policy:this.config,logicalTime:this.time,available:this.available,pauseReason:this.pauseReason,records:[...this.records.values()].map(r=>structuredClone(r)),events:structuredClone(this.events),compactedEvents:this.compactedEvents};}
}
function siteIdentity(record){if(!Number.isSafeInteger(record.generation)||record.generation<1)throw Error('Invalid generation');return 's'+hash(canonical({name:name(record.name),owner:fingerprint(record.publicKey),generation:record.generation})).slice(0,60);}
module.exports={OwnershipRegistry,siteIdentity,addMonths,DAY,MAX_RECORDS,MAX_EVENTS,MAX_RATE_SUBJECTS};
