'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const cp=require('./checkpoint.cjs'),{atomic}=require('../src/registry.cjs');
const digest=s=>crypto.createHash('sha256').update(JSON.stringify(s)).digest('hex');
const pins=s=>s.records.map(({name,owner,generation,sequence,revision,root,status})=>({name,owner,generation,sequence,revision,root,status}));
function read(file){if(fs.statSync(file).size>cp.MAX_BYTES)throw Error('Trust file exceeds bound');return JSON.parse(fs.readFileSync(file,'utf8'));}
class GuardedCheckpoint{
 constructor(file){this.file=file;this.guard=path.join(path.dirname(file),'trust','checkpoint-floor.json');this.backup=path.join(path.dirname(file),'trust','latest-checkpoint.json');}
 load(){if(!fs.existsSync(this.file)&&!fs.existsSync(this.guard))return null;if(!fs.existsSync(this.guard))throw Error('Checkpoint trust baseline missing: explicit local adoption required');const g=read(this.guard),s=cp.validateCheckpoint(read(this.file));if(g.version!==1||g.digest!==digest(s)||JSON.stringify(g.records)!==JSON.stringify(pins(s))||g.logicalTime!==s.logicalTime)throw Error('Checkpoint trust conflict or rollback: explicit recovery required');return cp.restoreCheckpoint(this.file);}
 save(registry,{adopt=false}={}){if(fs.existsSync(this.guard))this.load();else if(fs.existsSync(this.file)&&!adopt)throw Error('Explicit baseline adoption required');const temp=this.file+'.candidate';cp.saveCheckpoint(registry,temp);try{const s=cp.validateCheckpoint(read(temp));if(fs.existsSync(this.guard)){const g=read(this.guard);if(g.version!==1||!Array.isArray(g.records)||!Number.isSafeInteger(g.logicalTime)||s.logicalTime<g.logicalTime)throw Error('Checkpoint clock rollback');for(const old of g.records){const n=s.records.find(r=>r.name===old.name);if(!n||n.generation<old.generation||n.generation===old.generation&&(n.owner!==old.owner||n.sequence<old.sequence||n.revision<old.revision||n.revision===old.revision&&n.root!==old.root||old.status==='released'&&n.status!=='released'))throw Error('Durable ownership/content pin rollback');}}
 // Backup and guard commit before live ledger. A crash in between fails closed;
 // explicit recovery can restore the guard-matching backup, never guess a winner.
 atomic(this.backup,s);atomic(this.guard,{version:1,digest:digest(s),logicalTime:s.logicalTime,records:pins(s)});atomic(this.file,s);
 }finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}}
 recover({confirmed=false}={}){if(!confirmed)throw Error('Explicit recovery confirmation required');if(!fs.existsSync(this.guard)){const r=cp.restoreCheckpoint(this.file);this.save(r,{adopt:true});return this.load();}const g=read(this.guard),s=cp.validateCheckpoint(read(this.backup));if(g.version!==1||g.digest!==digest(s)||g.logicalTime!==s.logicalTime||JSON.stringify(g.records)!==JSON.stringify(pins(s)))throw Error('Recovery copy conflicts: restore matching trust and checkpoint files from a trusted backup; nothing overwritten');atomic(this.file,s);return this.load();}
}
module.exports={GuardedCheckpoint};
