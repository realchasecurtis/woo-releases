'use strict';
const policy=require('./policy.cjs');
// Called only after the owning chrome's sender + main-frame + exact URL checks.
function createBookmarkActions({bookmarks,confirm,openBookmarks,navigate,changed}){
 let busy=false;
 return async function dispatch(command,payload={}){
  if(busy)throw Error('A bookmark operation is already pending');busy=true;
  try{
   const id=payload?.id;
   if(command==='add-folder')bookmarks.addFolder(payload.title);
   else if(command==='rename')bookmarks.rename(id,payload.title);
   else if(command==='move')bookmarks.move(id,payload.parentId);
   else if(command==='delete'){
    const item=bookmarks.get(id),children=bookmarks.children(id);
    if(item.type==='folder'&&children.length){const snapshot=JSON.stringify(children);if(!await confirm('Delete '+item.title+' and its '+children.length+' bookmarks?'))return;if(JSON.stringify(bookmarks.children(id))!==snapshot)throw Error('Folder changed. Please review and delete again.');bookmarks.removeId(id,{confirmed:true});}else bookmarks.removeId(id);
   }else if(['open','open-tabs','open-window'].includes(command)){
    const item=bookmarks.get(id),rows=bookmarks.children(id);if(!rows.length)return;
    if(command==='open'&&item.type!=='bookmark')throw Error('Choose a bookmark');
    if(rows.length>20)throw Error('Open at most 20 bookmarks at once. Move some bookmarks into another folder.');
    const urls=rows.map(x=>policy.destination(x.url));
    if(rows.length>5){const snapshot=JSON.stringify(rows);if(!await confirm('Open all '+rows.length+' bookmarks'+(command==='open-window'?' in one new window':' in new tabs')+'?'))return;if(JSON.stringify(bookmarks.children(id))!==snapshot)throw Error('Folder changed. Please try again.');}
    if(command==='open')await navigate(urls[0]);else await openBookmarks(urls,{newWindow:command==='open-window'});
   }else throw Error('Unknown bookmark command');
   changed();
  }finally{busy=false;}
 };
}
module.exports={createBookmarkActions};
