'use strict';
const test=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Bookmarks}=require('../src/bookmarks.cjs'),{createBookmarkActions}=require('../src/bookmark-actions.cjs'),{createBookmarkOpener}=require('../src/bookmark-navigation.cjs');
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'woo-bookmark-synthetic-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return dir;}
test('v1 migration preserves records/order and exact backup; IDs survive reload',t=>{const dir=fixture(t),items=[{url:'https://example.com/a',title:'A',custom:'retained'},{url:'https://example.com/b',title:'B'}],raw=JSON.stringify({version:1,items});fs.writeFileSync(path.join(dir,'bookmarks.json'),raw);const b=new Bookmarks(dir);a.deepEqual(b.items.map(x=>x.url),items.map(x=>x.url));a.equal(b.items[0].custom,'retained');a.equal(fs.readFileSync(path.join(dir,fs.readdirSync(dir).find(x=>x.endsWith('.bak'))),'utf8'),raw);a.deepEqual(new Bookmarks(dir).items,b.items);});
test('folders preserve order, duplicate labels, IDs, stale target rejection, safe URLs and deletion backups',t=>{const dir=fixture(t),b=new Bookmarks(dir);b.toggle('https://example.com/a','same');b.toggle('https://example.com/b','same');const [x,y]=b.items;b.addFolder('same');b.addFolder('same');const f=b.items[2];b.move(y.id,f.id);b.move(x.id,f.id);a.deepEqual(b.children(f.id).map(x=>x.id),[y.id,x.id]);b.rename(x.id,'renamed');a.equal(b.get(x.id).url,x.url);a.throws(()=>b.move(x.id,'missing'));a.throws(()=>b.move(f.id,null));a.throws(()=>b.removeId(f.id));for(const url of ['javascript:alert(1)','data:text/html,bad','file:///secret'])a.throws(()=>b.toggle(url,'bad'));b.removeId(f.id,{confirmed:true});a.equal(b.items.length,1);a.ok(fs.readdirSync(dir).some(x=>x.includes('before-folder-delete')));});
test('authoritative commands confirm cancel, bound batches, reject stale edits and serialize pending work',async t=>{const b=new Bookmarks(fixture(t));b.addFolder('group');const f=b.items[0];for(let i=0;i<6;i++){b.toggle('https://example.com/'+i,'B');b.move(b.items.at(-1).id,f.id);}let allowed=false,opened=0;const dispatch=createBookmarkActions({bookmarks:b,confirm:async()=>allowed,openBookmarks:async urls=>{opened+=urls.length;},navigate:async()=>{},changed:()=>{}});await dispatch('open-tabs',{id:f.id});a.equal(opened,0);await dispatch('delete',{id:f.id});a.equal(b.children(f.id).length,6);allowed=true;await dispatch('open-window',{id:f.id});a.equal(opened,6);await a.rejects(dispatch('rename',{id:'stale',title:'bad'}));for(let i=6;i<21;i++){b.toggle('https://example.com/'+i,'B');b.move(b.items.at(-1).id,f.id);}await a.rejects(dispatch('open-tabs',{id:f.id}),/at most 20/);a.equal(opened,6);});
function context(count=1){const tabs={tabs:[],maxTabs:20,add(){const t={id:this.tabs.length+1,state:{page:'home'}};this.tabs.push(t);this.active=t;return t;},select(id){this.selected=id;},async navigate(url,tab){tab.url=url;}};for(let i=0;i<count;i++)tabs.add();return {win:{isDestroyed:()=>false},tabs};}
test('one shared-factory window per group, first blank reused, order and selected first preserved',async()=>{let created=0,target;const open=createBookmarkOpener({isRegistered:()=>true,createWindow:async()=>{created++;return target=context();}});await open({sourceContext:context(),urls:['https://example.com/a','https://example.com/b'],disposition:'window'});a.equal(created,1);a.equal(target.tabs.tabs.length,2);a.deepEqual(target.tabs.tabs.map(x=>x.url),['https://example.com/a','https://example.com/b']);a.equal(target.tabs.selected,1);});
test('full list/capacity validation before mutation and concurrent opening refused',async()=>{let created=0,release;const open=createBookmarkOpener({isRegistered:()=>true,createWindow:async()=>{created++;await new Promise(r=>release=r);return context();}}),source=context(20);await a.rejects(open({sourceContext:source,urls:['https://example.com/'],disposition:'tab'}));await a.rejects(open({sourceContext:source,urls:['file:///bad'],disposition:'window'}));a.equal(created,0);const pending=open({sourceContext:source,urls:['https://example.com/'],disposition:'window'});await a.rejects(open({sourceContext:source,urls:['https://example.com/'],disposition:'window'}),/already/);release();await pending;a.equal(created,1);});
test('chrome integration retains strict sender guard and ID-based commands',()=>{const main=fs.readFileSync(path.join(__dirname,'../src/main.cjs'),'utf8'),ui=fs.readFileSync(path.join(__dirname,'../src/bookmark-ui.js'),'utf8');a.match(main,/event.sender!==win.webContents\|\|event.senderFrame!==win.webContents.mainFrame\|\|event.senderFrame.url!==trusted/);a.ok(main.indexOf('sender(event,action);')<main.indexOf("case 'bookmark-command'"));a.match(ui,/ondragend=.*dragId=null/);a.match(ui,/Shift F10/);a.doesNotMatch(fs.readFileSync(path.join(__dirname,'../src/bookmark-navigation.cjs'),'utf8'),/new BrowserWindow/);});
test('folder changes during confirmation abort and pending commands cannot overlap',async t=>{const b=new Bookmarks(fixture(t));b.addFolder('group');const f=b.items[0];b.toggle('https://example.com/','A');b.move(b.items[1].id,f.id);let answer;const dispatch=createBookmarkActions({bookmarks:b,confirm:()=>new Promise(r=>answer=r),openBookmarks:async()=>{},navigate:async()=>{},changed:()=>{}});const pending=dispatch('delete',{id:f.id});await a.rejects(dispatch('rename',{id:f.id,title:'new'}),/pending/);b.toggle('https://example.com/2','B');b.move(b.items.at(-1).id,f.id);answer(true);await a.rejects(pending,/Folder changed/);a.equal(b.children(f.id).length,2);});
test('source closure or registry removal during factory await cancels without navigation and closes only empty target',async()=>{
 for(const reason of ['closed','unregistered']){
  const source=context(),target=context(),registered=new Set([source,target]);let closed=false,targetClosed=0,resolveFactory,navigated=0;
  source.win.isDestroyed=()=>closed;target.win.close=()=>targetClosed++;target.tabs.navigate=async()=>navigated++;
  const open=createBookmarkOpener({isRegistered:c=>registered.has(c),createWindow:()=>new Promise(r=>resolveFactory=r)});
  const pending=open({sourceContext:source,urls:['https://example.com/a','https://example.com/b'],disposition:'window'});
  if(reason==='closed')closed=true;else registered.delete(source);
  resolveFactory(target);await a.rejects(pending,/cancelled/);a.equal(navigated,0);a.equal(target.tabs.tabs.length,1);a.equal(targetClosed,1);
 }
});
test('cancelled source preserves newly created window populated while factory yielded',async()=>{
 const source=context(),target=context();let valid=true,resolveFactory,closed=0,navigated=0;
 target.win.close=()=>closed++;target.tabs.active.state={page:'web',url:'https://example.com/user'};target.tabs.navigate=async()=>navigated++;
 const open=createBookmarkOpener({isRegistered:c=>c!==source||valid,createWindow:()=>new Promise(r=>resolveFactory=r)});
 const pending=open({sourceContext:source,urls:['https://example.com/'],disposition:'window'});valid=false;resolveFactory(target);
 await a.rejects(pending,/cancelled/);a.equal(closed,0);a.equal(navigated,0);
});
test('navigation failure retains global lock until every sibling settles, including synchronous throw',async()=>{
 for(const synchronous of [false,true]){
  const source=context(),target=context();let settleSibling,created=0,reported=false;const calls=[];
  target.tabs.navigate=(url,tab)=>{calls.push({url,id:tab.id});if(calls.length===1){if(synchronous)throw Error('first failed');return Promise.reject(Error('first failed'));}return new Promise(r=>settleSibling=r);};
  const open=createBookmarkOpener({isRegistered:()=>true,createWindow:async()=>{created++;return target;}});
  const pending=open({sourceContext:source,urls:['https://example.com/a','https://example.com/b'],disposition:'window'});
  const observed=pending.then(()=>{reported=true;},error=>{reported=true;a.ok(error instanceof AggregateError);a.equal(error.errors[0].message,'first failed');});
  await new Promise(r=>setImmediate(r));a.equal(reported,false);a.deepEqual(calls.map(x=>x.id),[1,2]);a.equal(target.tabs.selected,1);
  await a.rejects(open({sourceContext:source,urls:['https://example.com/c'],disposition:'window'}),/already/);a.equal(created,1);
  settleSibling();await observed;a.equal(reported,true);
  await open({sourceContext:source,urls:['https://example.com/c'],disposition:'tab'});a.equal(source.tabs.tabs.length,2);
 }
});
test('missing or stale registry identity fails before creating a window',async()=>{
 a.throws(()=>createBookmarkOpener({createWindow:async()=>context()}),/registry/);let created=0;
 const open=createBookmarkOpener({isRegistered:()=>false,createWindow:async()=>{created++;return context();}});
 await a.rejects(open({sourceContext:context(),urls:['https://example.com/'],disposition:'window'}),/unregistered/);a.equal(created,0);
});

test('page-link caller freshness guard cancels before factory or after it yields',async()=>{
 const source=context(),target=context();let created=0,ready,allowed=false;
 const open=createBookmarkOpener({isRegistered:()=>true,createWindow:()=>{created++;return new Promise(resolve=>ready=resolve);}});
 await a.rejects(open({sourceContext:source,urls:['https://example.com/'],disposition:'window',stillAllowed:()=>allowed}),/changed/);a.equal(created,0);
 allowed=true;let closed=0,navigated=0;target.win.close=()=>closed++;target.tabs.navigate=()=>navigated++;
 const pending=open({sourceContext:source,urls:['https://example.com/'],disposition:'window',stillAllowed:()=>allowed});allowed=false;ready(target);
 await a.rejects(pending,/cancelled/);a.equal(created,1);a.equal(closed,1);a.equal(navigated,0);
});
