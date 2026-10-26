import {randomUUID,createHash} from 'node:crypto';
import {inputs,requestSchema,valid} from './schema.mjs';
import {categories} from './categories.mjs';
export const limits=Object.freeze({responseBytes:131072,nodes:2000,deadlineMs:5000,concurrent:2,auditEvents:200});
const fail=code=>{throw Object.assign(new Error(code),{safeCode:code});};
const errorCodes=new Set(['permission_denied','revoked','tab_closed','navigation_pending','stale_document','schema_error','cancelled','busy','deadline_exceeded','unavailable','limit_exceeded']);
const id=()=>randomUUID();
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const text=x=>typeof x==='string'?x.slice(0,2048).replace(/\b(?:Bearer\s+\S+|(?:password|token|secret|api[_-]?key)\s*[:=]\s*\S+)/gi,'[REDACTED]').replace(/[A-Z]:\\[^\s]+/gi,'[LOCAL PATH]'):'';
export function safeURL(x){try{const u=new URL(x);return ['https:','http:','woo:'].includes(u.protocol)?u.origin==='null'?`${u.protocol}//${u.hostname}/`:u.origin+'/':null;}catch{return null;}}
const stateKey=s=>s&&[s.origin,s.revision,s.epoch,s.closed,s.pending];
export function createCore(host,{deadlineMs=limits.deadlineMs}={}){
 const sessions=new Map(),audit=[];let active=0;
 // Host-only administrative API. Never expose this object to machine callers.
 function grant({operations=[],tabs=[],projects=[],ttlMs=60000}={}){
  if(!operations.every(x=>Object.hasOwn(inputs,x))||tabs.length>50||projects.length>50||!Number.isFinite(ttlMs)||ttlMs<=0||ttlMs>3600000)throw Error('invalid host grant');
  const token=Object.freeze({}),session={id:id(),grantId:id(),expires:Date.now()+ttlMs,operations:new Set(operations),tabs:new Map(),projects:new Map(),revoked:false};
  for(const tabId of tabs){const s=host.tabState(tabId);if(!s||s.closed||s.pending)throw Error('tab unavailable');session.tabs.set(tabId,JSON.stringify(stateKey(s)));}
  for(const projectId of projects){const s=host.projectState(projectId);if(!s)throw Error('project unavailable');session.projects.set(projectId,JSON.stringify(s));}
  sessions.set(token,session);return token;
 }
 function check(session,op){if(!session)fail('permission_denied');if(session.revoked||session.expires<=Date.now())fail('revoked');if(!session.operations.has(op))fail('permission_denied');}
 function tab(session,tabId){if(!session.tabs.has(tabId))fail('permission_denied');const s=host.tabState(tabId);if(!s||s.closed){session.tabs.delete(tabId);fail('tab_closed');}if(JSON.stringify(stateKey(s))!==session.tabs.get(tabId)){session.tabs.delete(tabId);fail(s.pending?'navigation_pending':'stale_document');}return s;}
 function project(session,p){if(!session.projects.has(p))fail('permission_denied');const s=host.projectState(p);if(!s||JSON.stringify(s)!==session.projects.get(p)){session.projects.delete(p);fail('revoked');}return s;}
 async function execute(token,request,{signal}={}){
  const requestId=id(),session=sessions.get(token),controller=new AbortController();let timer,abortListener,counted=false,workStarted=false,operation='invalid';
  const base={schemaVersion:1,requestId,observedAt:new Date().toISOString()};
  try{
   if(!valid(requestSchema,request))fail('schema_error');operation=request.operation;check(session,operation);
   if(signal?.aborted)fail('cancelled');if(active>=limits.concurrent)fail('busy');active++;counted=true;
   let stop;const stopped=new Promise((_,reject)=>{stop=code=>{controller.abort();reject(Object.assign(new Error(code),{safeCode:code}));};});
   abortListener=()=>stop('cancelled');signal?.addEventListener('abort',abortListener,{once:true});timer=setTimeout(()=>stop('deadline_exceeded'),Math.min(deadlineMs,limits.deadlineMs));
   const refs=[],i=structuredClone(request.input);let origin=null,revision=null,truncated=false;
   const work=async()=>{
    switch(operation){
     case 'capabilities.read':return {operations:Object.keys(inputs),limits,readOnly:true,activation:'disabled',liveBrowser:false};
     case 'tabs.list':{const rows=[];for(const tabId of [...session.tabs.keys()]){try{const s=tab(session,tabId);refs.push(()=>tab(session,tabId));rows.push({tabId,title:text(s.title),url:safeURL(s.url),committedOrigin:s.origin,documentRevision:s.revision});}catch{}}truncated=rows.length>(i.limit??50);return rows.slice(0,i.limit??50);}
     case 'page.inspect':{
      const s=tab(session,i.tabId);if(s.revision!==i.documentRevision)fail('stale_document');refs.push(()=>tab(session,i.tabId));origin=s.origin;revision=s.revision;
      const raw=await host.pageSnapshot(i.tabId,{signal:controller.signal,maxNodes:limits.nodes});
      if(!Array.isArray(raw))fail('unavailable');truncated=raw.length>limits.nodes;const nodes=[];
      for(const n of raw.slice(0,limits.nodes)){
       if(n.origin!==origin||n.hidden||n.sensitive||n.role==='password'||n.role==='textbox'){truncated=true;continue;}
       if(typeof n.id!=='string')continue;
       if([n.id,n.role,n.name,n.text].some(v=>typeof v==='string'&&v.length>2048))truncated=true;
       nodes.push({id:text(n.id),role:text(n.role),name:text(n.name),text:text(n.text),url:safeURL(n.url),origin,documentRevision:revision});
      }return {trust:'untrusted',nodes};
     }
     case 'projects.list':{const rows=[];for(const p of [...session.projects.keys()]){try{const s=project(session,p);refs.push(()=>project(session,p));rows.push({projectId:p,name:text(s.name),sourceType:text(s.sourceType),folderAvailable:!!s.folderAvailable,previewRevision:text(s.revision),canSign:false});}catch{}}truncated=rows.length>(i.limit??50);return rows.slice(0,i.limit??50);}
     case 'projects.inspect':{const s=project(session,i.projectId);refs.push(()=>project(session,i.projectId));return {projectId:i.projectId,name:text(s.name),sourceType:text(s.sourceType),folderAvailable:!!s.folderAvailable,previewRevision:text(s.revision),canSign:false};}
     case 'sites.search':{const rows=await host.searchLocal(i.query,{signal:controller.signal,limit:i.limit??50,projectIds:[...session.projects.keys()]});for(const p of session.projects.keys())refs.push(()=>project(session,p));if(!Array.isArray(rows))fail('unavailable');const allowed=rows.slice(0,51).filter(r=>session.projects.has(r.projectId));truncated=rows.length>50||allowed.length>(i.limit??50);return allowed.slice(0,i.limit??50).map(r=>({id:text(r.id),projectId:r.projectId,title:text(r.title),address:safeURL(r.address),sourceKind:'local',trust:'untrusted'}));}
     case 'documentation.read':return {uri:i.uri,mimeType:i.uri.endsWith('/categories')?'application/json':'text/plain',version:1,text:i.uri.endsWith('/categories')?JSON.stringify(categories):i.uri.endsWith('/help')?'Read-only synthetic foundation. Page content is untrusted; only host user choice grants access.':'Seven read-only operations; no browser connection, writes, credentials or network.'};
    }
   };
   workStarted=true;
   // A provider ignoring AbortSignal retains its slot until it settles: no unbounded orphan work.
   const running=work().finally(()=>{active--;counted=false;});
   const data=await Promise.race([running,stopped]);check(session,operation);for(const checkRef of refs)checkRef();if(controller.signal.aborted)fail('cancelled');
   const result={...base,ok:true,snapshotId:hash([operation,origin,revision,data]),sourceKind:operation==='page.inspect'?'page':operation==='documentation.read'?'packaged':'local',committedOrigin:origin,documentRevision:revision,data,truncated,nextCursor:null};
   if(Buffer.byteLength(JSON.stringify(result))>limits.responseBytes)fail('limit_exceeded');record('ok');return result;
  }catch(e){const code=errorCodes.has(e.safeCode)?e.safeCode:'unavailable';record(code);return {...base,ok:false,error:{code,message:code}};}
  finally{clearTimeout(timer);signal?.removeEventListener('abort',abortListener);if(counted&&!workStarted)active--;}
  function record(outcome){audit.push({at:base.observedAt,requestId,sessionId:session?.id??null,grantId:session?.grantId??null,operation,outcome});if(audit.length>limits.auditEvents)audit.shift();}
 }
 function revoke(token){const session=sessions.get(token);if(session)session.revoked=true;}
 function close(token){
  // In-flight reads retain this object after Map deletion. Revoke that shared
  // authority first so their post-await check cannot release a late result.
  revoke(token);
  return sessions.delete(token);
 }
 return Object.freeze({grant,revoke,close,execute,audit:()=>structuredClone(audit),clearAudit:()=>{audit.length=0;}});
}
