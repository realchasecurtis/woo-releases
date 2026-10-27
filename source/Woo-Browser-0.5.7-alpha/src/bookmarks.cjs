'use strict';
const fs=require('node:fs'),path=require('node:path'),{randomUUID}=require('node:crypto'),policy=require('./policy.cjs'),{atomic}=require('./registry.cjs');
const MAX_ITEMS=250,MAX_BOOKMARKS=200;
function title(value){if(typeof value!=='string'||!value.trim()||value.length>200||/[\x00-\x1f]/.test(value))throw Error('Bookmark title must be 1-200 printable characters');return value.trim();}
class Bookmarks{
 constructor(dir){this.file=path.join(dir,'bookmarks.json');this.items=[];if(!fs.existsSync(this.file))return;const bytes=fs.readFileSync(this.file);if(bytes.length>6*1024*1024)throw Error('Bookmark file exceeds limit');const data=JSON.parse(bytes);if(![1,2].includes(data.version)||!Array.isArray(data.items))throw Error('Invalid bookmark file');const items=data.version===1?data.items.map(x=>({...x,id:randomUUID(),type:'bookmark',parentId:null})):data.items;this.check(items);this.items=items;if(data.version===1){this.backup('v1',bytes);this.save(items);}}
 backup(label,bytes=fs.readFileSync(this.file)){const file=this.file+'.'+label+'.'+randomUUID()+'.bak';fs.writeFileSync(file,bytes,{flag:'wx'});return file;}
 check(items){if(items.length>MAX_ITEMS||items.filter(x=>x.type==='bookmark').length>MAX_BOOKMARKS)throw Error('Maximum 200 bookmarks and 50 folders');const ids=new Set();for(const x of items){if(typeof x.id!=='string'||!x.id||ids.has(x.id)||!['folder','bookmark'].includes(x.type))throw Error('Invalid bookmark ID or type');ids.add(x.id);title(x.title);if(x.type==='bookmark'){policy.destination(x.url);require('./favicon.cjs').safeData(x.icon);}else if(x.parentId!=null)throw Error('Nested folders are not supported');}if(items.filter(x=>x.type==='folder').length>50)throw Error('Maximum 50 folders');for(const x of items)if(x.parentId!=null&&!items.some(p=>p.id===x.parentId&&p.type==='folder'))throw Error('Bookmark folder no longer exists');}
 save(items){this.check(items);const data={version:2,items};if(Buffer.byteLength(JSON.stringify(data))>6*1024*1024)throw Error('Bookmark cache exceeds 6 MiB');atomic(this.file,data);this.items=items;return items;}
 get(id){const x=this.items.find(x=>x.id===id);if(!x)throw Error('Bookmark no longer exists');return x;}
 children(id){const x=this.get(id);return x.type==='folder'?this.items.filter(b=>b.parentId===id):[x];}
 toggle(url,name,icon){url=policy.destination(url);const old=this.items.find(x=>x.type==='bookmark'&&x.url===url);if(old)return this.removeId(old.id);icon=require('./favicon.cjs').safeData(icon);return this.save([...this.items,{id:randomUUID(),type:'bookmark',parentId:null,url,title:title(name||url),...(icon?{icon}:{})}]);}
 addFolder(name){return this.save([...this.items,{id:randomUUID(),type:'folder',parentId:null,title:title(name)}]);}
 rename(id,name){this.get(id);return this.save(this.items.map(x=>x.id===id?{...x,title:title(name)}:x));}
 move(id,parentId){const x=this.get(id);if(x.type!=='bookmark')throw Error('Only bookmarks can move into folders');if(parentId!==null&&this.get(parentId).type!=='folder')throw Error('Invalid folder');if(x.parentId===parentId)return this.items;return this.save([...this.items.filter(b=>b.id!==id),{...x,parentId}]);}
 removeId(id,{confirmed=false}={}){const x=this.get(id),children=this.items.filter(b=>b.parentId===id);if(x.type==='folder'&&children.length&&!confirmed)throw Error('Confirm deleting this folder and its bookmarks');if(children.length)this.backup('before-folder-delete');return this.save(this.items.filter(b=>b.id!==id&&b.parentId!==id));}
 edit(url,name){const x=this.items.find(x=>x.url===policy.destination(url));if(!x)throw Error('Bookmark no longer exists');return this.rename(x.id,name);}
 remove(url){const x=this.items.find(x=>x.url===policy.destination(url));return x?this.removeId(x.id):this.items;}
 setIcon(url,icon){icon=require('./favicon.cjs').safeData(icon);if(!icon||!this.items.some(x=>x.url===url&&x.icon!==icon))return;this.save(this.items.map(x=>x.url===url?{...x,icon}:x));}
}
module.exports={Bookmarks,apiVersion:2};
