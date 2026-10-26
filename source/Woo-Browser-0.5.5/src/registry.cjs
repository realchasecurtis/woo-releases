'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const http = require('node:http');
const https = require('node:https');
const policy = require('./policy.cjs');
const MAX = 1024 * 1024;
const builtinRecords=()=>snapshot({version:1,records:require('./builtin-shortcuts.json').map(r=>({...r,owner:'woo-builtin',note:'Reserved built-in HTTPS shortcut, not a native hosted site.'}))}).records;
const seeds = {version:1, records:[
  {name:'example.woo', destination:'https://example.com/', owner:'local-operator', note:'DEMO: IANA example domain; not owned by Woo or Chase.'},
  {name:'learn.woo', destination:'https://www.wikipedia.org/', owner:'local-operator', note:'DEMO: Wikipedia, an independent third-party site.'}
]};
function snapshot(input) {
  if (!input || input.version !== 1 || !Array.isArray(input.records) || input.records.length > 2000) throw Error('Expected version 1 snapshot, maximum 2,000 records.');
  const seen = new Set();
  return {version:1, records:input.records.map(r => {
    if (!r || typeof r !== 'object') throw Error('Invalid record.');
    const n = policy.name(r.name);
    if(seen.has(n)) throw Error('Duplicate name: '+n); seen.add(n);
    if(typeof r.owner !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(r.owner)) throw Error('Owner must be a 1–64 character local account label.');
    if(typeof r.note !== 'string' || r.note.length>500 || /[\x00-\x1f]/.test(r.note)) throw Error('Note must be plain text, maximum 500 characters.');
    const text=(v,max)=>{if(v===undefined)return '';if(typeof v!=='string'||v.length>max||/[\x00-\x1f]/.test(v))throw Error('Invalid discovery metadata');return v;};
    const aliases=r.aliases===undefined?[]:r.aliases;if(!Array.isArray(aliases)||aliases.length>12)throw Error('Invalid aliases');
    const metadata={};if(r.title!==undefined)metadata.title=text(r.title,160);if(r.description!==undefined)metadata.description=text(r.description,500);if(r.aliases!==undefined)metadata.aliases=[...new Set(aliases.map(a=>text(a,80).trim()).filter(Boolean))];
    return {name:n,destination:policy.destination(r.destination),owner:r.owner,note:r.note,...metadata};
  }).sort((a,b)=>a.name.localeCompare(b.name))};
}
function parse(text) { if(Buffer.byteLength(text)>MAX) throw Error('Snapshot exceeds 1 MiB.'); return snapshot(JSON.parse(text)); }
function atomic(file,data) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const temp=file+'.'+crypto.randomBytes(8).toString('hex')+'.tmp';
  try { fs.writeFileSync(temp,JSON.stringify(data,null,2)+'\n',{flag:'wx'}); fs.renameSync(temp,file); } finally { if(fs.existsSync(temp)) fs.unlinkSync(temp); }
}
class Registry {
  constructor(dir,{allowNewRegistrations=false}={}) { this.allowNewRegistrations=allowNewRegistrations===true; this.file=path.join(dir,'registry.json'); if(!fs.existsSync(this.file)) atomic(this.file,snapshot(seeds)); this.read(); }
  read() { return parse(fs.readFileSync(this.file,'utf8')); }
  list(){const saved=this.read().records;return [...saved,...builtinRecords().filter(b=>!saved.some(r=>r.name===b.name))];}
  get(n) { return this.list().find(r=>r.name===policy.name(n)); }
  put(record,replace=false) {
    const r=snapshot({version:1,records:[record]}).records[0], s=this.read(), i=s.records.findIndex(x=>x.name===r.name);
    if(i<0&&!this.allowNewRegistrations)throw Error('Domain creation is temporarily closed. New registry entries cannot be added.');
    if(i<0)require('../sdk/namespace.cjs').assertClaimable(r.name);
    if(i>=0 && !replace) throw Error('Name already registered. Select it and explicitly replace it.');
    if(i>=0) s.records[i]=r; else s.records.push(r);
    atomic(this.file,snapshot(s)); return r;
  }
  remove(n) { const s=this.read(); s.records=s.records.filter(r=>r.name!==policy.name(n)); atomic(this.file,s); }
  import(text) { if(!this.allowNewRegistrations)throw Error('Domain creation is temporarily closed. Importing new names is unavailable.');const incoming=parse(text), s=this.read(); for(const r of incoming.records) { require('../sdk/namespace.cjs').assertClaimable(r.name); if(s.records.some(x=>x.name===r.name)) throw Error('Import conflict: '+r.name+'. No records changed.'); s.records.push(r); } atomic(this.file,snapshot(s)); return incoming.records.length; }
}
function serve(registry,port=47831) {
  const server=http.createServer((req,res)=>{
    res.setHeader('Content-Type','application/json'); res.setHeader('Cache-Control','no-store'); res.setHeader('X-Content-Type-Options','nosniff');
    if(req.method!=='GET') { res.writeHead(405); return res.end('{"error":"read-only"}'); }
    try {
      const u=new URL(req.url,'http://127.0.0.1');
      if(u.pathname==='/v1/snapshot') return res.end(JSON.stringify(registry.read()));
      if(u.pathname==='/v1/resolve') { const r=registry.get(u.searchParams.get('name')); res.writeHead(r?200:404); return res.end(JSON.stringify(r||{error:'Name not registered'})); }
      res.writeHead(404); res.end('{"error":"Not found"}');
    } catch {res.writeHead(400);res.end('{"error":"Invalid request"}');}
  });
  server.listen(port,'127.0.0.1'); return server;
}
async function remoteResolve(base,n) {
  base=policy.endpoint(base); n=policy.name(n);
  const u=new URL('/v1/resolve?name='+encodeURIComponent(n),base);
  const local=u.protocol==='http:' && u.hostname==='127.0.0.1';
  const address=local?'127.0.0.1':await policy.publicAddress(u.hostname);
  return new Promise((resolve,reject)=>{
    const req=(local?http:https).get(u,{agent:false,lookup:(_host,opts,cb)=>opts.all?cb(null,[{address,family:4}]):cb(null,address,4)},res=>{
      if(res.statusCode!==200) {res.resume();return reject(Error(res.statusCode===404?'Woo name not registered.':'Registry unavailable (HTTP '+res.statusCode+').'));}
      let bytes=0,parts=[];
      res.on('data',b=>{bytes+=b.length;if(bytes>16384) req.destroy(Error('Registry response too large.'));else parts.push(b);});
      res.on('error',reject);
      res.on('end',()=>{try {const r=snapshot({version:1,records:[JSON.parse(Buffer.concat(parts).toString())]}).records[0];if(r.name!==n) throw Error('Registry returned a different name.');resolve(r);}catch(e){reject(e);}});
    });
    const timeout=setTimeout(()=>req.destroy(Error('Registry timed out.')),6000);req.on('close',()=>clearTimeout(timeout));req.on('error',reject);
  });
}
module.exports={Registry,snapshot,parse,seeds,serve,remoteResolve,atomic};
