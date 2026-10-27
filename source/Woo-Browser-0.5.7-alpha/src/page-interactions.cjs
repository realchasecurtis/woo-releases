'use strict';
const policy=require('./policy.cjs');
// Only main-process native events and native menu/dialog callbacks enter here.
// No renderer bridge, page-provided gesture flag, features or referrer is authority.
function createPageInteractions({windows,openLinks,downloads,Menu,dialog,clipboard,frameOwner,now=Date.now}){
 let promptBusy=false,lastPrompt=-Infinity;const epochs=new WeakMap(),documents=new WeakMap();
 function capture(tab,frame){const wc=tab.view.webContents,c=windows.owner(wc);try{if(!c||c.tabs!==tab.owner||tab.closed||tab.pending||tab.state.pendingURL||tab.state.page!=='web'||c.tabs.active!==tab||c.win.isDestroyed()||wc.isDestroyed()||!frame||frameOwner(frame)!==wc)return null;const frameURL=frame.url;policy.destination(frameURL);const seq=tab.seq,page=wc.getURL();policy.destination(page);return {tab,wc,c,frame,frameURL,seq,page,epoch:epochs.get(wc)||0,document:documents.get(wc)};}catch{return null;}}
 function current(s){try{return !!s&&!s.tab.pending&&!s.tab.state.pendingURL&&documents.get(s.wc)===s.document&&(epochs.get(s.wc)||0)===s.epoch&&!s.tab.closed&&!s.wc.isDestroyed()&&!s.c.win.isDestroyed()&&windows.owner(s.wc)===s.c&&s.tab.owner===s.c.tabs&&s.c.tabs.active===s.tab&&s.tab.seq===s.seq&&s.tab.state.page==='web'&&s.wc.getURL()===s.page&&frameOwner(s.frame)===s.wc&&s.frame.url===s.frameURL;}catch{return false;}}
 function notice(tab,message){if(tab.closed||tab.owner.win.isDestroyed())return;tab.state.message=message;tab.owner.onChange();}
 function blocked(s,url,message){const d=s.document;if(!d)return;
  // Keep the first pending HTTPS address stable under a popup flood: subsequent
  // page requests cannot swap the destination under the trusted chrome button.
  if(url&&!d.pending){d.pending=url;d.authority=s;}
  const next={url:d.pending||null,message:d.pending?'A page-requested link was blocked. Open only the address you intended.':message};
  if(JSON.stringify(s.tab.state.blockedLink)!==JSON.stringify(next)){s.tab.state.blockedLink=next;s.tab.owner.onChange();}
 }
 function claimPrompt(s){if(s.document.prompted)return false;s.document.prompted=true;if(promptBusy||now()-lastPrompt<2000)return false;promptBusy=true;lastPrompt=now();return true;}
 function clearPending(s){s.document.pending=null;s.document.authority=null;s.tab.state.blockedLink=null;s.tab.owner.onChange();}
 function explain(s,message){blocked(s,null,message);if(!claimPrompt(s))return;try{void Promise.resolve(dialog.showMessageBox(s.c.win,{type:'info',title:'Link could not open',message,buttons:['Done'],defaultId:0,cancelId:0,noLink:true})).catch(()=>{}).finally(()=>{promptBusy=false;});}catch{promptBusy=false;}}
 async function route(s,url,disposition){if(!current(s))return;const safe=policy.destination(url);await openLinks({sourceContext:s.c,urls:[safe],disposition,stillAllowed:()=>current(s)});}
 async function openBlocked(tab){const s=capture(tab,tab.view.webContents.mainFrame);if(!s||!s.document.pending||!current(s.document.authority))throw Error('This blocked link is no longer available');const url=policy.destination(s.document.pending),authority=s.document.authority;clearPending(s);await route(authority,url,'tab');}
 function install(tab){const wc=tab.view.webContents;let menu=null,menuWindow=null;documents.set(wc,{prompted:false,pending:null});
  const closeMenu=()=>{epochs.set(wc,(epochs.get(wc)||0)+1);if(menu){try{menu.closePopup(menuWindow);}catch{}menu=null;menuWindow=null;}};
  // Invalidate notices without replenishing this document's modal allowance.
  wc.on('did-start-navigation',()=>{closeMenu();const d=documents.get(wc);if(d){d.pending=null;d.authority=null;}tab.state.blockedLink=null;if(!tab.closed&&!tab.owner.win.isDestroyed())tab.owner.onChange();});wc.once('destroyed',closeMenu);
  // did-navigate is main-frame document navigation only; hash/history and
  // subframe events must never replenish the automatic modal allowance.
  wc.on('did-navigate',()=>{documents.set(wc,{prompted:false,pending:null});tab.state.blockedLink=null;if(!tab.closed&&!tab.owner.win.isDestroyed())tab.owner.onChange();});
  wc.setWindowOpenHandler(details=>{const s=capture(tab,wc.mainFrame);if(!s)return {action:'deny'};
   // Electron 45's handler has no userGesture or initiating-frame field. A
   // native, default-deny confirmation is the fallback for every popup request.
   if(details.postBody){explain(s,'This link submits a form into a new window. Woo cannot replay that submission safely. Open the form in this tab, or use the site’s direct HTTPS link.');return {action:'deny'};}
   if(details.url==='about:blank'||!details.url){explain(s,'This site opens a blank window and fills it later. Woo blocks that flow; use a direct HTTPS link (right-click to open it), or the site’s same-tab option.');return {action:'deny'};}
   let url;try{url=policy.destination(details.url);}catch{explain(s,'Link blocked: Woo supports public HTTPS links only. Mail, app, HTTP and script links are not opened externally.');return {action:'deny'};}
   blocked(s,url,'A page-requested link was blocked.');if(!claimPrompt(s))return {action:'deny'};
   void (async()=>{try{const answer=await dialog.showMessageBox(s.c.win,{type:'question',title:'Open link requested by page?',message:'Open this HTTPS link?',detail:'Current tab: '+new URL(s.page).origin+'\nRequested address:\n'+url+'\n\nWoo cannot verify whether this new-window request came from your click. Open only the link you intended.',buttons:['Cancel','Open in New Tab','Open in New Window'],defaultId:0,cancelId:0,noLink:true});if(!current(s))return;if(answer.response===1||answer.response===2){clearPending(s);await route(s,url,answer.response===2?'window':'tab');}}catch(e){notice(tab,'Link could not open: '+e.message);}finally{promptBusy=false;}})();
   return {action:'deny'};
  });
  wc.on('context-menu',(_event,params)=>{closeMenu();const s=capture(tab,params.frame),raw=params.linkURL;if(!s||typeof raw!=='string'||!raw||raw.length>4096||/[\x00-\x1f\x7f]/.test(raw)||!Number.isInteger(params.x)||!Number.isInteger(params.y))return;
   let safe;try{safe=policy.destination(raw);}catch{}
   const click=fn=>()=>{if(!current(s))return;Promise.resolve().then(()=>{if(current(s))return fn();}).catch(e=>notice(tab,e.message));};
   const available=downloads.status().available;
   const template=[
    {label:'Open in New Tab',enabled:!!safe,click:click(()=>route(s,safe,'tab'))},
    {label:'Open in New Window',enabled:!!safe,click:click(()=>route(s,safe,'window'))},
    {label:available?'Save Link As…':'Save Link As… (unavailable in this build)',enabled:!!safe&&available,click:click(()=>downloads.requestFromMenu(s.wc,s.frame,safe,()=>current(s)))},
    {label:'Copy Link Address',click:click(()=>clipboard.writeText(raw))},
    {type:'separator'},
    {label:'Inspect',click:click(()=>s.wc.inspectElement(params.x,params.y))}
   ];
   if(!safe)template.unshift({label:'Only public HTTPS links can be opened or saved',enabled:false});
   menu=Menu.buildFromTemplate(template);menuWindow=s.c.win;const shown=menu;menu.popup({window:menuWindow,callback:()=>{if(menu===shown){menu=null;menuWindow=null;}}});
  });
 }
 return {install,openBlocked};
}
module.exports={createPageInteractions};
