(function(root){
'use strict';
const normalize=s=>String(s).normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
function distance(a,b){let r=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const n=[i];for(let j=1;j<=b.length;j++)n[j]=Math.min(n[j-1]+1,r[j]+1,r[j-1]+(a[i-1]!==b[j-1]));r=n;}return r[b.length];}
function createSearch({includeDefaults=true,aliases=[],providers=[],weights={exact:100,prefix:75,token:50,typo:25}}={}){
 for(const k of ['exact','prefix','token','typo'])if(!Number.isFinite(weights[k])||weights[k]<=0)throw Error('Invalid ranking weights');
 function suggest(input,records=[]){const q=normalize(input);if(!q||q.length>256)return [];
 const items=includeDefaults?[{title:'X / Twitter',names:['x','twitter','x.com','twitter.com'],url:'https://x.com/',kind:'Curated official destination'}]:[];
 for(const r of records){try{const u=new URL(r.destination);if(u.protocol!=='https:'||u.username||u.password||! /^(?:[a-z0-9-]+\.)+[a-z0-9-]+$/.test(r.name))continue;items.push({title:r.name,names:[r.name],url:'woo://'+r.name,destination:u.href,kind:'Local registry'});}catch{}}
 for(const item of aliases)items.push(item);
 for(const provider of providers){try{const extra=provider(q,records);if(Array.isArray(extra))items.push(...extra.slice(0,100));}catch{}}
 return items.filter(item=>{try{const u=new URL(item.url);return typeof item.title==='string'&&item.title.length<=200&&Array.isArray(item.names)&&item.names.length<=20&&item.names.every(n=>typeof n==='string'&&n.length<=253)&&['https:','woo:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}}).map(item=>{let score=0;for(const name of item.names){const n=normalize(name);score=Math.max(score,n===q?weights.exact:q.length>=2&&n.startsWith(q)?weights.prefix:q.length>=2&&q.split(' ').every(t=>n.split(/[.\s/-]+/).some(w=>w.startsWith(t)))?weights.token:q.length>=4&&distance(q,n)<=2?weights.typo:0);}return {...item,score};}).filter(i=>i.score).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title)).slice(0,6);
}
function decision(input,records=[]){const q=String(input).trim();if(!q)return {kind:'empty'};if(/^[a-z][a-z0-9+.-]*:/i.test(q)||(!/\s/.test(q)&&q.includes('.')))return {kind:'navigate',url:q};const results=suggest(q,records);return results.length===1&&results[0].names.some(n=>normalize(n)===normalize(q))?{kind:'navigate',url:results[0].url}:{kind:'suggest',results};}
return {suggest,decision};}
const api={apiVersion:1,normalize,createSearch,...createSearch()};if(typeof module!=='undefined')module.exports=api;else root.WooSearch=api;
})(globalThis);
