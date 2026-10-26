'use strict';
const fs=require('node:fs'),path=require('node:path');const root=path.join(__dirname,'ai-docs');
function manifest(){const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));if(m.schemaVersion!==1||m.productVersion!=='0.5.3'||!Array.isArray(m.documents)||m.documents.length>30)throw Error('Invalid local documentation manifest');return m;}
function list(){return manifest().documents.map(({id,title})=>({id,title}));}
function read(id){if(typeof id!=='string')throw Error('Choose a documentation chapter');const d=manifest().documents.find(x=>x.id===id);if(!d||! /^[a-z0-9-]+\.(md|json)$/.test(d.file))throw Error('Unknown documentation chapter');const p=path.join(root,d.file);if(fs.statSync(p).size>128*1024)throw Error('Documentation chapter exceeds limit');return {id:d.id,title:d.title,text:fs.readFileSync(p,'utf8')};}
function combined(){const m=manifest();const text='# Woo AI documentation bundle '+m.productVersion+'\n\n'+m.documents.map(d=>'\n\n--- '+d.file+' ---\n\n'+read(d.id).text).join('');if(Buffer.byteLength(text)>512*1024)throw Error('Documentation bundle exceeds clipboard limit');return text;}
module.exports={list,read,combined};
