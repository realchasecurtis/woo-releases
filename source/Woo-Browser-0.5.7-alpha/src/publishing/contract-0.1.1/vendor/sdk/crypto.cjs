'use strict';
const crypto=require('node:crypto');
function canonical(v){if(v===null||typeof v==='boolean'||typeof v==='string')return JSON.stringify(v);if(typeof v==='number'&&Number.isFinite(v))return JSON.stringify(v);if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';if(v&&Object.getPrototypeOf(v)===Object.prototype)return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';throw Error('Unsupported canonical value');}
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function publicKey(pem){const k=crypto.createPublicKey(pem);if(k.asymmetricKeyType!=='ed25519')throw Error('Ed25519 key required');return k;}
const fingerprint=pem=>hash(publicKey(pem).export({type:'spki',format:'der'}));
function fixtureKey(){const k=crypto.generateKeyPairSync('ed25519');return {privateKey:k.privateKey,publicKey:k.publicKey.export({type:'spki',format:'pem'}).toString()};}
function sign(payload,key){return {payload,signature:crypto.sign(null,Buffer.from(canonical(payload)),key).toString('base64')};}
function verify(envelope,pem){try{if(!envelope||typeof envelope.signature!=='string'||envelope.signature.length!==88)return false;return crypto.verify(null,Buffer.from(canonical(envelope.payload)),publicKey(pem),Buffer.from(envelope.signature,'base64'));}catch{return false;}}
module.exports={canonical,hash,fingerprint,fixtureKey,sign,verify};
