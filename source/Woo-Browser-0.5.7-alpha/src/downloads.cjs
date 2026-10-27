'use strict';
const crypto=require('node:crypto'),policy=require('./policy.cjs');
const MAX_BYTES=512*1024*1024,MAX_ACTIVE=2,MAX_HISTORY=40;
function filename(value){const s=String(value||'download').normalize('NFKC').replace(/[<>:"/\\|?*\x00-\x1f\x7f\u202a-\u202e\u2066-\u2069]/g,'_').replace(/[. ]+$/g,'').slice(0,120).replace(/[. ]+$/g,'');return !s||/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(s)?'download':s;}
function clean(rows){if(!Array.isArray(rows))return [];return rows.slice(0,MAX_HISTORY).filter(r=>r&&/^[a-f0-9-]{36}$/.test(r.id)&&Number.isFinite(r.time)&&['completed','cancelled','failed','interrupted','progressing'].includes(r.state)).map(r=>({id:r.id,name:filename(r.name),time:r.time,state:r.state==='progressing'?'interrupted':r.state,received:Math.max(0,Math.min(MAX_BYTES,Number(r.received)||0)),total:Math.max(0,Math.min(MAX_BYTES,Number(r.total)||0))}));}
function create({load=()=>[],save=()=>{},onChange=()=>{},owns=()=>false,ownsFrame=(wc,frame)=>frame===wc.mainFrame,platformApproved=false,now=Date.now,publicAddress=policy.publicAddress}){let rows=clean(load()),closed=false;const active=new Map();let lastPrompt=0;
 const menuIntents=new Map(),menuRequests=new Set();
 function forget(wc){const old=menuIntents.get(wc);if(old)clearTimeout(old.timer);menuIntents.delete(wc);}
 async function requestFromMenu(wc,sourceFrame,value,current){
  if(!platformApproved||closed)throw Error('Downloads are not available in this build.');
  if(typeof current!=='function'||!current()||!owns(wc)||!ownsFrame(wc,sourceFrame)||wc.isDestroyed())throw Error('Link source changed');
  if(menuRequests.has(wc)||menuIntents.has(wc)||active.size>=MAX_ACTIVE||now()-lastPrompt<1000)throw Error('A download is already pending. Try again shortly.');
  const parsed=new URL(policy.destination(value));parsed.hash='';const url=parsed.href,frame=wc.mainFrame,frameURL=policy.destination(frame.url),sourceURL=policy.destination(sourceFrame.url);
  menuRequests.add(wc);
  try{await publicAddress(parsed.hostname);
   if(closed||!current()||!owns(wc)||wc.isDestroyed()||wc.mainFrame!==frame||frame.url!==frameURL||!ownsFrame(wc,sourceFrame)||sourceFrame.url!==sourceURL)throw Error('Link source changed');
   const intent={url,frame,frameURL,sourceFrame,sourceURL,current,expires:now()+5000};menuIntents.set(wc,intent);intent.timer=setTimeout(()=>{if(menuIntents.get(wc)===intent)forget(wc);},5000);intent.timer.unref?.();
   try{wc.downloadURL(url);}catch(e){forget(wc);throw e;}
  }finally{menuRequests.delete(wc);}
 }
 function takeMenuIntent(wc,frame,urls){const intent=menuIntents.get(wc);if(!intent)return false;
  // A menu authorizes one exact starting URL from one unchanged document. It
  // does not waive the platform gate, redirect policy, caps or native Save UI.
  if(now()>=intent.expires){forget(wc);return false;}
  if(!urls.length||policy.destination(urls[0])!==intent.url)return false;
  forget(wc);
  return intent.current()&&!wc.isDestroyed()&&wc.mainFrame===intent.frame&&intent.frame.url===intent.frameURL&&ownsFrame(wc,intent.sourceFrame)&&intent.sourceFrame.url===intent.sourceURL&&(frame==null||frame===intent.frame);
 }
 let historyWarning='';const trim=()=>{const live=rows.filter(r=>active.has(r.id));rows=[...live,...rows.filter(r=>!active.has(r.id)).slice(0,MAX_HISTORY-live.length)];};
 const snapshot=()=>rows.map(r=>({...r,canCancel:active.has(r.id)}));const changed=(persist=false)=>{trim();if(persist){try{save(rows.map(r=>({...r})));historyWarning='';}catch{historyWarning='History could not be saved; this list may not survive restart.';}}onChange();};
 function handle(event,item,wc,frame){try{if(!platformApproved||closed||!owns(wc)||active.size>=MAX_ACTIVE||now()-lastPrompt<1000)throw Error('Download not admitted');const urls=item.getURLChain();if(!urls.length||urls.length>10)throw Error('Redirect bound');for(const u of urls)policy.destination(u);const menu=takeMenuIntent(wc,frame,urls);if(!menu){if(frame!==wc.mainFrame||item.hasUserGesture()!==true)throw Error('Explicit download gesture required');const origin=item.getInitiatorOrigin();if(!origin||origin==='null'||origin!==new URL(policy.destination(frame.url)).origin)throw Error('Initiator mismatch');}if(item.getTotalBytes()>MAX_BYTES)throw Error('Download too large');}catch{event.preventDefault();return;}
 lastPrompt=now();let r;try{r={id:crypto.randomUUID(),name:filename(item.getFilename()),time:now(),state:'progressing',received:0,total:Math.max(0,item.getTotalBytes())};}catch{event.preventDefault();return;}const id=r.id;let timer,ended=false;
 const finish=state=>{if(ended)return;ended=true;clearTimeout(timer);active.delete(id);try{r.received=Math.min(MAX_BYTES,Math.max(0,item.getReceivedBytes()));}catch{}r.state=['completed','cancelled'].includes(state)?state:'failed';changed(true);};
 const update=(_e,state)=>{if(closed||!active.has(id))return;try{r.received=item.getReceivedBytes();r.total=Math.max(0,item.getTotalBytes());if(r.received>MAX_BYTES||r.total>MAX_BYTES){item.cancel();return;}r.state=state==='interrupted'?'interrupted':'progressing';changed();}catch{try{item.cancel();}catch{}finish('failed');}};
 const done=(_e,state)=>finish(state);
 rows.unshift(r);active.set(id,item);
 // Keep Chromium's save dialog, overwrite confirmation and OS safety marking.
 // No setSavePath, URL replay, custom byte writes, shell open or renderer paths.
 try{item.on('updated',update);item.once('done',done);item.setSaveDialogOptions({title:'Save Download',defaultPath:r.name,buttonLabel:'Save',properties:['showOverwriteConfirmation']});timer=setTimeout(()=>{if(active.has(id)){try{item.cancel();}catch{finish('failed');}}},30*60*1000);timer.unref?.();changed(true);}
 catch{clearTimeout(timer);try{item.removeListener('updated',update);item.removeListener('done',done);}catch{}finish('failed');event.preventDefault();}
 }
 return {handle,requestFromMenu,snapshot,status:()=>({available:platformApproved&&!closed,historyWarning,message:platformApproved?'Choose Save in the system dialog. Files never open automatically.':'Downloads are not available in this review build. Platform safety checks are pending.'}),cancel(id){if(typeof id!=='string'||!active.has(id))throw Error('Unknown active download');active.get(id).cancel();},clear(){rows=rows.filter(r=>active.has(r.id));changed(true);},close(){closed=true;for(const wc of menuIntents.keys())forget(wc);for(const item of active.values())item.cancel();},limits:{MAX_BYTES,MAX_ACTIVE,MAX_HISTORY}};
}
module.exports={create,filename,clean,MAX_BYTES};
