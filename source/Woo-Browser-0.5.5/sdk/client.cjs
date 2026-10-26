'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');const {atomic}=require('../src/registry.cjs');
const {fingerprint}=require('./crypto.cjs');
const {siteIdentity}=require('./ownership.cjs');
const {verifyBundle}=require('./host.cjs');
// Records must come from an explicitly trusted registry/ownership channel.
// Never silently adopt a changed ownership key or claim generation.
class VerifiedSiteClient {
 constructor({file}={}){this.file=file;this.pins=new Map();if(file){const marker=file+'.initialized';if(fs.existsSync(marker)&&!fs.existsSync(file))throw Error('Durable site pins missing; restore trusted backup');if(fs.existsSync(file)){if(fs.statSync(file).size>1024*1024)throw Error('Site pins too large');const raw=fs.readFileSync(file,'utf8');if(!fs.existsSync(marker)||fs.readFileSync(marker,'utf8')!==crypto.createHash('sha256').update(raw).digest('hex'))throw Error('Site pin rollback or conflict; restore trusted backup');const s=JSON.parse(raw);if(s.version!==1||!Array.isArray(s.pins)||s.pins.length>2000)throw Error('Invalid durable pins');for(const [name,pin] of s.pins){if(typeof name!=='string'||!pin||! /^[a-f0-9]{64}$/.test(pin.owner)||!Number.isSafeInteger(pin.generation)||pin.generation<1||!Number.isSafeInteger(pin.revision)||pin.revision<0||pin.root!==null&&! /^[a-f0-9]{64}$/.test(pin.root))throw Error('Invalid durable site pin');this.pins.set(name,pin);}}}}
 persist(){if(this.file){atomic(this.file,{version:1,pins:[...this.pins]});fs.writeFileSync(this.file+'.initialized',crypto.createHash('sha256').update(fs.readFileSync(this.file)).digest('hex'));}}
 acceptOwnership(record){if(record.owner!==fingerprint(record.publicKey))throw Error('Owner fingerprint mismatch');const old=this.pins.get(record.name);if(old&&record.generation<=old.generation&&(old.owner!==record.owner||old.generation!==record.generation))throw Error('Ownership rollback');if(old&&old.owner===record.owner&&old.generation===record.generation)return;this.pins.set(record.name,{owner:record.owner,generation:record.generation,revision:0,root:null});}
 verify(record,bundle){const pin=this.pins.get(record.name);if(!pin||pin.owner!==record.owner||pin.generation!==record.generation)throw Error('Explicit ownership adoption required');if(record.revision<pin.revision||(record.revision===pin.revision&&pin.root!==null&&record.root!==pin.root))throw Error('Content rollback or equivocation');const files=verifyBundle(bundle,record);pin.revision=record.revision;pin.root=record.root;this.persist();return {files,identity:siteIdentity(record)};}
}
module.exports={VerifiedSiteClient};
