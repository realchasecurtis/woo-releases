const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),http=require('node:http');
const p=require('../src/policy.cjs');
const {Registry,parse,snapshot,serve,remoteResolve}=require('./fixture-registry.cjs');
const {startProxy}=require('../src/proxy.cjs');
test('names canonicalize and malformed names are rejected',()=>{
 assert.equal(p.name('Example.Woo'),'example.woo');
 for(const n of ['', 'localhost','a..bunker','-x.bunker','x.bunker/','x.bunker@evil.com','💀.woo','xn--x.woo'])assert.throws(()=>p.name(n));
});
test('destinations reject unsafe schemes, addresses, credentials and ports',()=>{
 assert.equal(p.destination('https://example.com'),'https://example.com/');
 for(const u of ['file:///etc/passwd','javascript:alert(1)','http://example.com','https://127.0.0.1','https://2130706433','https://[::1]','https://localhost','https://x.local','https://user:pass@example.com','https://example.com:8443'])assert.throws(()=>p.destination(u),u);
});
test('address filtering covers private, reserved and mapped addresses',async()=>{
 for(const ip of ['127.0.0.1','10.2.3.4','172.16.1.1','192.168.1.1','169.254.169.254','100.64.1.2','0.0.0.0','198.19.1.1','192.0.2.1','224.0.0.1','255.255.255.255','::ffff:127.0.0.1'])assert.equal(p.publicIPv4(ip),false,ip);
 assert.equal(p.publicIPv4('1.1.1.1'),true);
 await assert.rejects(p.publicAddress('example.com',async()=>['1.1.1.1','10.0.0.1']));
 assert.equal(await p.publicAddress('example.com',async()=>['1.1.1.1']),'1.1.1.1');
});
test('registry persists, canonical conflict checks and explicit operator replacement',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'woo-unit-'));const r=new Registry(dir);
 assert.equal(r.get('EXAMPLE.WOO').destination,'https://example.com/');
 const rec={name:'studio.bunker',destination:'https://example.org',owner:'operator',note:'test'};
 r.put(rec);assert.throws(()=>r.put(rec));assert.equal(new Registry(dir).get(rec.name).owner,'operator');
 r.put({...rec,owner:'new-owner'},true);assert.equal(r.get(rec.name).owner,'new-owner');r.remove(rec.name);assert.equal(r.get(rec.name),undefined);
});
test('snapshot imports are atomic, bounded, duplicate-safe and transferable',()=>{
 const r=new Registry(fs.mkdtempSync(path.join(os.tmpdir(),'woo-import-')));const before=JSON.stringify(r.read());
 for(const bad of ['{',' '.repeat(1024*1024+1),JSON.stringify({version:2,records:[]}),JSON.stringify({version:1,records:[{name:'x.woo',destination:'http://example.com',owner:'x',note:''}]})]){assert.throws(()=>r.import(bad));assert.equal(JSON.stringify(r.read()),before);}
 assert.throws(()=>r.import(before));assert.equal(JSON.stringify(r.read()),before);
 const other=new Registry(fs.mkdtempSync(path.join(os.tmpdir(),'woo-transfer-')));for(const rec of other.read().records)other.remove(rec.name);other.import(before);assert.deepEqual(other.read(),r.read());
 assert.throws(()=>snapshot({version:1,records:[...r.read().records,...r.read().records]}));
});
test('read-only service resolves and refuses writes; client handles outage/missing names',async()=>{
 const r=new Registry(fs.mkdtempSync(path.join(os.tmpdir(),'woo-service-')));const s=serve(r,0);await new Promise(resolve=>s.on('listening',resolve));const base='http://127.0.0.1:'+s.address().port;
 try{assert.equal((await remoteResolve(base,'example.woo')).destination,'https://example.com/');await assert.rejects(remoteResolve(base,'missing.bunker'));
 const status=await new Promise((resolve,reject)=>{const q=http.request(base+'/v1/resolve',{method:'POST'},res=>{res.resume();resolve(res.statusCode);});q.on('error',reject);q.end();});assert.equal(status,405);
 }finally{await new Promise(r=>s.close(r));}
 await assert.rejects(remoteResolve(base,'example.woo'));
});
test('remote endpoint rejects private hosts, credentials, queries and unexpected paths',()=>{
 assert.equal(p.endpoint(''),'');assert.equal(p.endpoint('http://127.0.0.1:47831'),'http://127.0.0.1:47831');
 for(const e of ['http://example.com','http://localhost:47831','https://127.0.0.1','https://example.com/path','https://a:b@example.com','https://example.com/?token=x'])assert.throws(()=>p.endpoint(e));
});
test('CONNECT gateway rejects loopback, raw-IP and non-HTTPS tunnels',async()=>{
 const proxy=await startProxy();
 try{for(const target of ['127.0.0.1:443','localhost:443','example.com:80']){
 const status=await new Promise((resolve,reject)=>{const q=http.request({hostname:'127.0.0.1',port:proxy.port,method:'CONNECT',path:target});q.on('connect',(res,s)=>{s.destroy();resolve(res.statusCode);});q.on('error',reject);q.end();});assert.equal(status,403);
 }}finally{proxy.close();}
});
test('remote client rejects malicious, mismatched, redirected and oversized registry answers',async()=>{
 let body,code=200;
 const s=http.createServer((_q,res)=>{res.writeHead(code,{'Content-Type':'application/json',Location:'http://127.0.0.1/'});res.end(body);});
 await new Promise(r=>s.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+s.address().port;
 try{
  for(const record of [{name:'other.bunker',destination:'https://example.com/',owner:'x',note:''},{name:'example.woo',destination:'https://127.0.0.1/',owner:'x',note:''}]){body=JSON.stringify(record);await assert.rejects(remoteResolve(base,'example.woo'));}
  body='x'.repeat(17000);await assert.rejects(remoteResolve(base,'example.woo'));
  code=302;body='{}';await assert.rejects(remoteResolve(base,'example.woo'));
 }finally{await new Promise(r=>s.close(r));}
});
