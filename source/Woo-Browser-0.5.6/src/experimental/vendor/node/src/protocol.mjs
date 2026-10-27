import {createHash,generateKeyPairSync,createPublicKey,sign,verify} from 'node:crypto';
export const LIMITS=Object.freeze({bundle:1024*1024,file:256*1024,files:32,wire:1500000,records:64});
export const hash=b=>createHash('sha256').update(b).digest('hex');
const fail=m=>{throw Error(m);};
export function exact(o,keys){if(!o||Object.getPrototypeOf(o)!==Object.prototype||Object.keys(o).sort().join()!==[...keys].sort().join())fail('Invalid schema');}
export function b64(s,max){if(typeof s!=='string'||s.length>Math.ceil(max/3)*4)fail('Oversized encoding');const b=Buffer.from(s,'base64');if(b.length>max||b.toString('base64')!==s)fail('Invalid base64');return b;}
export function fixtureIdentity(){const k=generateKeyPairSync('ed25519');return {privateKey:k.privateKey,publicKey:k.publicKey.export({type:'spki',format:'der'}).toString('base64')};}
export function siteId(publicKey){const der=b64(publicKey,128),key=createPublicKey({key:der,type:'spki',format:'der'});if(key.asymmetricKeyType!=='ed25519'||!key.export({type:'spki',format:'der'}).equals(der))fail('Invalid key');return 'woo:'+hash(der);}
export function safePath(p){return typeof p==='string'&&p.length<=180&&/^\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(html|css|txt|png|jpg|svg)$/.test(p);}
const MIME={html:'text/html',css:'text/css',txt:'text/plain',png:'image/png',jpg:'image/jpeg',svg:'image/svg+xml'};
export function bundle(files){return encodeBundle(Object.entries(files).sort(([a],[b])=>a.localeCompare(b,'en')).map(([path,data])=>[path,Buffer.from(data).toString('base64')]));}
function encodeBundle(entries){const bytes=Buffer.from(JSON.stringify(['woo-bundle-v1',entries]));verifyBundle(bytes);return bytes;}
export function verifyBundle(bytes,root=hash(bytes)){
 if(!Buffer.isBuffer(bytes)||bytes.length>LIMITS.bundle)fail('Oversized bundle');if(hash(bytes)!==root)fail('Bundle hash mismatch');
 const v=JSON.parse(bytes.toString('utf8'));if(!Array.isArray(v)||v.length!==2||v[0]!=='woo-bundle-v1'||!Array.isArray(v[1])||v[1].length>LIMITS.files)fail('Invalid bundle');
 const out=new Map();for(const f of v[1]){if(!Array.isArray(f)||f.length!==2||!safePath(f[0])||out.has(f[0]))fail('Unsafe or duplicate path');out.set(f[0],{bytes:b64(f[1],LIMITS.file),mime:MIME[f[0].split('.').at(-1)]});}if(!out.has('/index.html'))fail('Missing index');return out;
}
function descriptor(d){exact(d,['visibility','label','title','description']);if(d.visibility!=='public')fail('Private descriptor prohibited');for(const [k,max]of [['label',64],['title',160],['description',512]])if(typeof d[k]!=='string'||d[k].length>max||/[\u0000-\u001f]/.test(d[k]))fail('Invalid descriptor');if(!/^[a-z0-9][a-z0-9-]*$/.test(d.label))fail('Invalid scoped label');}
export function recordBytes(p){return Buffer.from(JSON.stringify(['woo-record-v1',p.siteId,p.publicKey,p.revision,p.root,p.descriptor.visibility,p.descriptor.label,p.descriptor.title,p.descriptor.description]));}
export function publish(identity,bytes,revision,descriptor){verifyBundle(bytes);const payload={siteId:siteId(identity.publicKey),publicKey:identity.publicKey,revision,root:hash(bytes),descriptor};const record={payload,signature:sign(null,recordBytes(payload),identity.privateKey).toString('base64')};verifyRecord(record);return record;}
export function verifyRecord(r){exact(r,['payload','signature']);const p=r.payload;exact(p,['siteId','publicKey','revision','root','descriptor']);descriptor(p.descriptor);if(p.siteId!==siteId(p.publicKey)||!Number.isSafeInteger(p.revision)||p.revision<1||!/^\w{64}$/.test(p.root)||!/^[0-9a-f]+$/.test(p.root))fail('Invalid record');const key=createPublicKey({key:b64(p.publicKey,128),format:'der',type:'spki'});if(!verify(null,recordBytes(p),key,b64(r.signature,64)))fail('Invalid signature');return p;}
export function recordId(r){verifyRecord(r);return hash(recordBytes(r.payload));}
