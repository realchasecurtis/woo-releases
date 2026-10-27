'use strict';
const policy=require('./policy.cjs');
// Both callbacks come from the application's single window factory/registry.
function createBookmarkOpener({createWindow,isRegistered}){
 if(typeof isRegistered!=='function')throw Error('Bookmark opener requires the window registry');
 const live=context=>!context.win.isDestroyed()&&isRegistered(context);
 function closeUnusedWindow(target,source){
  if(target===source||target.win.isDestroyed())return;
  const rows=target.tabs.tabs,tab=rows[0];
  // Creation may yield to user interaction. Never discard a populated window.
  if(rows.length===1&&tab.state.page==='home'&&!tab.state.url&&!tab.state.loading&&!tab.pending&&!tab.native&&!tab.committed&&(!tab.view||!tab.view.webContents.getURL()))target.win.close();
 }
 let opening=false;
 return async function openBookmarks({sourceContext,urls,disposition,stillAllowed=()=>true}){
  if(opening)throw Error('Bookmarks are already opening');
  if(!['tab','window'].includes(disposition)||!Array.isArray(urls)||!urls.length||urls.length>20)throw Error('Invalid bookmark group');
  const safe=urls.map(url=>policy.destination(url));
  if(!live(sourceContext)||!stillAllowed())throw Error('Source window closed, unregistered or changed');
  if(disposition==='tab'&&sourceContext.tabs.tabs.length+safe.length>sourceContext.tabs.maxTabs)throw Error('Close some tabs before opening this group');
  opening=true;
  try{
   const target=disposition==='window'?await createWindow():sourceContext;
   // The factory yields: the original sender may have closed or unregistered.
   if(!live(sourceContext)||!live(target)||!stillAllowed()){
    if(disposition==='window')closeUnusedWindow(target,sourceContext);
    throw Error('Bookmark opening cancelled: window closed or unregistered');
   }
   const reuse=disposition==='window'&&target.tabs.tabs.length===1&&target.tabs.active.state.page==='home';
   if(target.tabs.tabs.length+safe.length-(reuse?1:0)>target.tabs.maxTabs)throw Error('Too many tabs for this window');
   const opened=[];
   for(let i=0;i<safe.length;i++){const tab=i===0&&reuse?target.tabs.active:target.tabs.add(false);opened.push(tab);}
   // Reserve every slot synchronously before any navigation can yield.
   target.tabs.select(opened[0].id);
   const results=await Promise.allSettled(opened.map(async(tab,i)=>target.tabs.navigate(safe[i],tab)));
   const failures=results.filter(result=>result.status==='rejected');
   if(failures.length)throw new AggregateError(failures.map(result=>result.reason),'Some bookmarks could not be opened');
  }finally{opening=false;}
 };
}
module.exports={createBookmarkOpener};
