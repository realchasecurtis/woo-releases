'use strict';
const fs=require('node:fs'),path=require('node:path');const root=path.join(__dirname,'ai-docs');const {describe,fail}=require('./capability-descriptor.cjs');
function manifest(){const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));if(m.schemaVersion!==1||m.productVersion!==require('../package.json').version||!Array.isArray(m.documents)||m.documents.length>30)throw Error('Invalid local documentation manifest');return m;}
function list(){return manifest().documents.map(({id,title})=>({id,title}));}
function read(id){if(typeof id!=='string')fail('schema_error');const d=manifest().documents.find(x=>x.id===id);if(!d||! /^[a-z0-9-]+\.(md|json)$/.test(d.file))fail('unknown_resource');const p=path.join(root,d.file);if(fs.statSync(p).size>128*1024)fail('limit_exceeded');const text=d.id==='capabilities-json'?JSON.stringify(describe(),null,2):fs.readFileSync(p,'utf8');if(Buffer.byteLength(text)>128*1024)fail('limit_exceeded');return {id:d.id,title:d.title,mime:d.file.endsWith('.json')?'application/json':'text/markdown',text};}
function combined(){const m=manifest();const text='# Woo AI documentation bundle '+m.productVersion+'\n\n'+m.documents.map(d=>'\n\n--- '+d.file+' ---\n\n'+read(d.id).text).join('');if(Buffer.byteLength(text)>512*1024)fail('limit_exceeded');return text;}
module.exports={list,read,combined,describe};
