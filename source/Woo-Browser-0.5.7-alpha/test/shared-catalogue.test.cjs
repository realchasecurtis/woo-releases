'use strict';
const {test}=require('node:test'),a=require('node:assert/strict'),{EventEmitter}=require('node:events');
const {SharedCatalogue,fetchCatalogue,parseCatalogue,sourceURL,visibleShared,MAX_BYTES,MAX_RECORDS}=require('../src/shared-catalogue.cjs');
const {resolveTarget,nativeName}=require('../src/address-resolution.cjs');
const {createProvider}=require('../sdk/discovery.cjs');
const source='https://raw.githubusercontent.com/realchasecurtis/woo-releases/main/network/catalogue-v1.json';
const destination='https://raw.githubusercontent.com/realchasecurtis/woo-releases/main/network/welcome.txt';
const record={name:'welcome.woo',destination,owner:'woo-operator',note:'Operator-curated alias',title:'Welcome',description:'Hello world!'};
const bytes=(records=[record])=>Buffer.from(JSON.stringify({version:1,records}));
const empty={get:()=>undefined};
test('fresh clients fetch shared metadata, discover and resolve exact name without profile imports',async()=>{
 let calls=0;const transport=async url=>{a.equal(url,source);calls++;return bytes();};
 for(let i=0;i<2;i++){const c=new SharedCatalogue({enabled:true,url:source,transport});await Promise.all([c.ensure(),c.ensure()]);a.equal(c.status().state,'ready');
  const discovery=createProvider({readShared:()=>visibleShared(c,empty)});a.match(discovery.search('welcome')[0].source,/Shared operator/);
  for(const name of ['welcome.woo','woo://welcome.woo','WELCOME.WOO'])a.deepEqual(await resolveTarget(name,{registry:empty,sharedRegistry:c}),{url:destination,name:'welcome.woo'});
  await a.rejects(resolveTarget('missing.woo',{registry:empty,sharedRegistry:c}),/not registered/);
 }a.equal(calls,2);
});
test('explicit HTTPS stays web; native/local precedence and custom resolver remain separate',async()=>{
 const c=new SharedCatalogue({enabled:true,url:source,transport:async()=>bytes()});await c.ensure();
 a.equal(nativeName('welcome.woo',n=>n==='welcome.woo'),'welcome.woo');a.deepEqual(visibleShared(c,empty,()=>true),[]);
 const registry={get:n=>n==='welcome.woo'?{...record,destination:'https://example.com/'}:null};
 a.deepEqual(visibleShared(c,registry),[]);a.equal((await resolveTarget('welcome.woo',{registry,sharedRegistry:c})).url,'https://example.com/');
 a.equal((await resolveTarget('https://welcome.woo/',{registry:empty,sharedRegistry:c})).url,'https://welcome.woo/');
 const remoteResolve=async(base,n)=>{a.equal(base,'https://registry.example/');return {...record,name:n,destination:'https://example.org/'};};
 a.equal((await resolveTarget('welcome.woo',{registry:empty,sharedRegistry:c,endpoint:'https://registry.example/',remoteResolve})).url,'https://example.org/');
});
test('schema, counts, bytes, duplicates, text and destination policy fail closed',()=>{
 a.equal(parseCatalogue(bytes())[0].name,'welcome.woo');
 for(const b of [Buffer.from('{}'),Buffer.from('{'),Buffer.from([0xff]),Buffer.alloc(MAX_BYTES+1),bytes(Array(MAX_RECORDS+1).fill(record)),bytes([record,record]),Buffer.from(JSON.stringify({version:1,records:[],script:'bad'})),bytes([{...record,script:'bad'}]),bytes([{...record,name:'localhost'}]),bytes([{...record,owner:'bad owner'}]),bytes([{...record,note:'\n'}]),bytes([{...record,title:'x'.repeat(161)}])])a.throws(()=>parseCatalogue(b));
 for(const url of ['http://example.com/','https://127.0.0.1/','https://user:secret@example.com/','file:///secret','https://example.com:444/','https://app.local/']){a.throws(()=>parseCatalogue(bytes([{...record,destination:url}])));a.throws(()=>sourceURL(url));}
 for(const url of [source+'?token=x',source+'#fragment'])a.throws(()=>sourceURL(url));
});
test('failure and timeout expose unavailable state without local success or stale results',async()=>{
 let mode='good',calls=0;const c=new SharedCatalogue({enabled:true,url:source,timeoutMs:10,transport:async()=>{calls++;if(mode==='hang')return new Promise(()=>{});if(mode==='bad')throw Error('offline');return bytes();}});
 await c.ensure();a.equal(c.list().length,1);mode='bad';await c.refresh();a.equal(c.status().state,'unavailable');a.deepEqual(c.list(),[]);a.match(c.status().message,/offline/);
 mode='hang';await c.refresh();a.match(c.status().message,/timed out/);a.deepEqual(c.list(),[]);a.equal(calls,3);
 const disabled=new SharedCatalogue({url:source,transport:()=>{throw Error('must not fetch');}});await disabled.ensure();a.equal(disabled.status().state,'disabled');
});
function wire({status=200,body=bytes(),headers={},error,aborted=false}={}){
 let count=0,options;const request=(url,opts,callback)=>{count++;options=opts;a.equal(url.href,source);const req=new EventEmitter();req.destroy=e=>queueMicrotask(()=>req.emit('error',e));queueMicrotask(()=>{if(error)return req.emit('error',error);const res=new EventEmitter();res.statusCode=status;res.headers=headers;res.resume=()=>{};callback(res);if(aborted)res.emit('aborted');else{res.emit('data',body);res.emit('end');}});return req;};return {request,get count(){return count;},get options(){return options;}};
}
test('real HTTPS transport rejects redirects, oversized/encoded/interrupted responses; pins public DNS',async()=>{
 const w=wire();a.deepEqual(await fetchCatalogue(source,{request:w.request,publicAddress:async()=> '1.1.1.1'}),bytes());a.equal(w.options.agent,false);
 w.options.lookup('ignored',{all:true},(e,ips)=>{a.equal(e,null);a.deepEqual(ips,[{address:'1.1.1.1',family:4}]);});
 for(const options of [{status:301},{status:302},{status:404},{headers:{'content-length':String(MAX_BYTES+1)}},{headers:{'content-encoding':'gzip'}},{body:Buffer.alloc(MAX_BYTES+1)},{error:Error('TLS rejected')},{aborted:true}]){const x=wire(options);await a.rejects(fetchCatalogue(source,{request:x.request,publicAddress:async()=> '1.1.1.1'}));a.equal(x.count,1);}
 const x=wire();await a.rejects(fetchCatalogue(source,{request:x.request,publicAddress:async()=> '127.0.0.1'}),/non-public/);a.equal(x.count,0);
});
test('deadline includes stalled DNS; source activation and public sample are exact',async()=>{
 const w=wire(),c=new SharedCatalogue({enabled:true,url:source,timeoutMs:10,transport:(url,options)=>fetchCatalogue(url,{...options,request:w.request,publicAddress:()=>new Promise(()=>{})})});await c.ensure();a.match(c.status().message,/timed out/);a.equal(w.count,0);
 const config=require('../src/shared-catalogue-config.json');a.equal(config.enabled,true);a.equal(config.url,source);
 const fs=require('node:fs'),path=require('node:path');const records=parseCatalogue(fs.readFileSync(path.join(__dirname,'../network/catalogue-v1.json')));a.equal(records.length,1);a.equal(records[0].destination,destination);a.equal(fs.readFileSync(path.join(__dirname,'../network/welcome.txt'),'utf8'),'Hello world!\n');
});
