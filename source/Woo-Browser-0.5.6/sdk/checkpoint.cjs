'use strict';
const fs=require('node:fs');
const {OwnershipRegistry,MAX_RECORDS,MAX_EVENTS,MAX_RATE_SUBJECTS}=require('./ownership.cjs');
const {fingerprint}=require('./crypto.cjs');
const {name}=require('../src/policy.cjs');
const {atomic}=require('../src/registry.cjs');
const MAX_BYTES=4*1024*1024;
function validate(s){
 if(s.checkpointVersion!==2||s.version!==1||!Array.isArray(s.records)||s.records.length>MAX_RECORDS||!Number.isSafeInteger(s.logicalTime)||s.logicalTime<0)throw Error('Invalid checkpoint');
 new OwnershipRegistry({clock:()=>s.logicalTime,config:s.policy});const names=new Set();
 for(const r of s.records){if(!r||name(r.name)!==r.name||names.has(r.name)||fingerprint(r.publicKey)!==r.owner||!['active','grace','release-pending','released'].includes(r.status))throw Error('Invalid checkpoint owner');names.add(r.name);for(const field of ['generation','sequence','revision','lastActivity'])if(!Number.isSafeInteger(r[field])||r[field]<(field==='generation'||field==='sequence'?1:0))throw Error('Invalid checkpoint counter');if(r.lastActivity>s.logicalTime||(r.root!==null&&!/^[a-f0-9]{64}$/.test(r.root))||(r.revision===0)!==(r.root===null))throw Error('Invalid checkpoint revision');if(['grace','release-pending'].includes(r.status)&&(!Number.isSafeInteger(r.graceUntil)||r.graceUntil<r.lastActivity))throw Error('Invalid grace');}
 if(!Array.isArray(s.events)||s.events.length>MAX_EVENTS||!Number.isSafeInteger(s.compactedEvents)||s.compactedEvents<0||!Array.isArray(s.attempts)||s.attempts.length>MAX_RATE_SUBJECTS||!Array.isArray(s.globalAttempts)||s.globalAttempts.length>s.policy.maxGlobalAttempts)throw Error('Invalid checkpoint history');
 for(const e of s.events)if(!e||typeof e.type!=='string'||e.type.length>80||JSON.stringify(e).length>2048)throw Error('Invalid event');
 const validTimes=(xs,max)=>Array.isArray(xs)&&xs.length<=max&&xs.every(t=>Number.isSafeInteger(t)&&t>=0&&t<=s.logicalTime);const subjects=new Set();
 for(const pair of s.attempts){if(!Array.isArray(pair)||pair.length!==2||!/^[a-f0-9]{64}$/.test(pair[0])||subjects.has(pair[0])||!validTimes(pair[1],s.policy.maxAttempts))throw Error('Invalid rate history');subjects.add(pair[0]);}
 if(!validTimes(s.globalAttempts,s.policy.maxGlobalAttempts))throw Error('Invalid global history');if(Buffer.byteLength(JSON.stringify(s))>MAX_BYTES)throw Error('Checkpoint exceeds 4 MiB');return s;
}
function saveCheckpoint(registry,file){const base=registry.export(),dropped=Math.max(0,base.events.length-MAX_EVENTS);const data=validate({...base,events:base.events.slice(-MAX_EVENTS),compactedEvents:base.compactedEvents+dropped,checkpointVersion:2,attempts:[...registry.attempts],globalAttempts:registry.globalAttempts});if(Buffer.byteLength(JSON.stringify(data,null,2)+'\n')>MAX_BYTES)throw Error('Checkpoint exceeds 4 MiB');atomic(file,data);}
function restoreCheckpoint(file,{clock=Date.now}={}){if(fs.statSync(file).size>MAX_BYTES)throw Error('Checkpoint too large');const s=validate(JSON.parse(fs.readFileSync(file,'utf8')));const r=new OwnershipRegistry({clock,config:s.policy});r.time=s.logicalTime;r.available=false;r.pauseReason='restored-requires-operator-resume';r.lastWall=clock();for(const rec of s.records){r.records.set(rec.name,structuredClone(rec));r.generations.set(rec.name,rec.generation);}r.attempts=new Map(s.attempts);r.globalAttempts=s.globalAttempts;r.events=s.events;r.compactedEvents=s.compactedEvents;r.event({type:'restored-paused',time:r.time});return r;}
module.exports={saveCheckpoint,restoreCheckpoint,validateCheckpoint:validate,MAX_BYTES};
