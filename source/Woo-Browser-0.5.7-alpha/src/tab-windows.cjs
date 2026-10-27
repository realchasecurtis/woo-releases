'use strict';
const {randomBytes}=require('node:crypto');
// The registry is the sole authority for chrome windows and transient drag leases.
class TabWindows {
 constructor({trusted,cursor,createWindow,now=Date.now}){Object.assign(this,{trusted,cursor,createWindow,now});this.windows=new Map();this.drag=null;}
 register(context){this.windows.set(context.win.webContents.id,context);return context;}
 unregister(context){for(const [id,registered] of this.windows){if(registered===context){this.windows.delete(id);break;}}if(this.drag?.source===context)this.drag=null;}
 sender(event){const c=this.windows.get(event.sender.id);if(!c||c.win.isDestroyed()||event.sender!==c.win.webContents||event.senderFrame!==event.sender.mainFrame||event.senderFrame.url!==this.trusted)throw Error('Untrusted tab sender');return c;}
 owner(wc){for(const c of this.windows.values())if(c.tabs.tabs.some(t=>!t.closed&&t.view.webContents===wc))return c;return null;}
 geometry(c,p){if(!p||!Array.isArray(p.tabs)||p.tabs.length>20||![p.left,p.right,p.top,p.bottom,...p.tabs.flatMap(t=>[t.id,t.mid])].every(Number.isFinite)||p.left<0||p.top<0||p.bottom>84||p.right<p.left)throw Error('Invalid tab geometry');c.geometry=p;}
 begin(c,id){const tab=c.tabs.tabs.find(t=>t.id===id&&!t.closed);if(!tab)throw Error('Unknown tab');this.drag={source:c,tab,token:randomBytes(24).toString('hex'),expires:this.now()+30000};c.closePopovers();return this.drag.token;}
 cancel(c,token){if(this.drag?.source===c&&(!token||token===this.drag.token))this.drag=null;}
 target(point){const covering=[],hits=[];for(const c of this.windows.values()){if(c.win.isDestroyed()||!c.win.isVisible()||c.win.isMinimized())continue;const b=c.win.getContentBounds(),outer=c.win.getBounds?.()||b;
  if(point.x<outer.x||point.x>=outer.x+outer.width||point.y<outer.y||point.y>=outer.y+outer.height)continue;covering.push(c);if(!c.geometry)continue;
  const z=c.win.webContents.getZoomFactor(),g=c.geometry,x=(point.x-b.x)/z,y=(point.y-b.y)/z;if(x>=g.left&&x<=g.right&&y>=g.top&&y<=g.bottom)hits.push({context:c,index:g.tabs.filter(t=>x>t.mid).length});}
  // Map insertion/focus order does not establish native stacking order. A body
  // from another Woo window can obscure a strip too. Reject instead of guessing.
  if(hits.length&&covering.length>1)return {ambiguous:true};return hits[0]||null;
 }
 current(d,c){return this.drag===d&&d.source===c&&this.now()<d.expires&&this.windows.get(c.win.webContents.id)===c&&!c.win.isDestroyed()&&!d.tab.closed&&!d.tab.view.webContents.isDestroyed()&&d.tab.owner===c.tabs&&c.tabs.tabs.includes(d.tab);}
 async finish(c,token){const d=this.drag;if(!d||d.source!==c||d.token!==token)throw Error('Invalid drag token');if(d.finishing)throw Error('Drag already finishing');d.finishing=true;if(!this.current(d,c)){this.drag=null;return false;}
  const point=this.cursor(),hit=this.target(point);let target=hit?.context,index=hit?.index,newWindow=false;
  if(hit?.ambiguous){this.drag=null;return false;}
  if(!target){try{target=await this.createWindow(point);}catch(e){if(this.drag===d)this.drag=null;throw e;}newWindow=true;index=0;}
  // Window creation yields to other IPC, closes and timer expiry. Recheck the
  // exact lease, contexts, live page and ownership immediately before commit.
  if(!this.current(d,c)||this.windows.get(target.win.webContents.id)!==target||target.win.isDestroyed()){if(this.drag===d)this.drag=null;if(newWindow&&!target.win.isDestroyed())target.win.close();return false;}
  this.drag=null;
  const placeholder=newWindow?target.tabs.active:null;
  try{this.transfer(d.tab,target,index);if(placeholder)target.tabs.close(placeholder.id);target.win.show();target.win.focus();return true;}catch(e){if(newWindow&&d.tab.owner!==target.tabs&&!target.win.isDestroyed())target.win.close();throw e;}
 }
 transfer(tab,destination,index){const source=tab.owner,target=destination.tabs;if(tab.closed||!source.tabs.includes(tab)||!Number.isInteger(index)||index<0||index>target.tabs.length)throw Error('Invalid transfer');if(source!==target&&target.tabs.length>=target.maxTabs)throw Error('Maximum 20 tabs reached');
  const oldIndex=source.tabs.indexOf(tab);if(source===target){source.tabs.splice(oldIndex,1);source.tabs.splice(index>oldIndex?index-1:index,0,tab);source.sync();return;}
  destination.closePopovers();const previousSource=source.activeId;
  // Keep the source alive even when its only tab is detached. Create before mutation.
  const replacement=source.tabs.length===1?source.add(false):null;
  try{source.win.contentView.removeChildView(tab.view);target.win.contentView.addChildView(tab.view);}catch(e){source.win.contentView.addChildView(tab.view);if(replacement)source.close(replacement.id);source.activeId=previousSource;throw e;}
  source.tabs.splice(source.tabs.indexOf(tab),1);target.tabs.splice(index,0,tab);tab.owner=target;
  source.activeId=source.tabs.some(t=>t.id===previousSource)?previousSource:source.tabs[Math.min(oldIndex,source.tabs.length-1)].id;target.activeId=tab.id;
  // Visibility hidden by a source suggestion panel must not follow the tab.
  tab.hidden=!['web','native'].includes(tab.state.page)||!!tab.pending;
  source.sync();target.sync();
 }
}
module.exports={TabWindows};
