'use strict';
const fs=require('node:fs'),path=require('node:path'),policy=require('./policy.cjs'),{atomic}=require('./registry.cjs');
class Bookmarks{
 constructor(dir){this.file=path.join(dir,'bookmarks.json');this.items=[];if(fs.existsSync(this.file)){if(fs.statSync(this.file).size>6*1024*1024)throw Error('Bookmark file exceeds limit');const data=JSON.parse(fs.readFileSync(this.file,'utf8'));if(data.version!==1||!Array.isArray(data.items)||data.items.length>200)throw Error('Invalid bookmark file');this.items=data.items.map(x=>this.validate(x));if(new Set(this.items.map(x=>x.url)).size!==this.items.length)throw Error('Duplicate bookmark URLs');}}
 validate(x){const url=policy.destination(x?.url);if(typeof x.title!=='string'||!x.title.trim()||x.title.length>200||/[\x00-\x1f]/.test(x.title))throw Error('Bookmark title must be 1–200 printable characters');const icon=require('./favicon.cjs').safeData(x.icon);return {url,title:x.title.trim(),...(icon?{icon}:{})};}
 save(items){if(Buffer.byteLength(JSON.stringify({version:1,items}))>6*1024*1024)throw Error('Bookmark cache exceeds 6 MiB');atomic(this.file,{version:1,items});this.items=items;return this.items;}
 toggle(url,title,icon){url=policy.destination(url);if(this.items.some(x=>x.url===url))return this.save(this.items.filter(x=>x.url!==url));if(this.items.length>=200)throw Error('Maximum 200 bookmarks');return this.save([...this.items,this.validate({url,title:title||url,icon})]);}
 edit(url,title){const b=this.validate({url,title,icon:this.items.find(x=>x.url===url)?.icon});if(!this.items.some(x=>x.url===b.url))throw Error('Bookmark no longer exists');return this.save(this.items.map(x=>x.url===b.url?b:x));}
 setIcon(url,icon){icon=require('./favicon.cjs').safeData(icon);if(!icon||!this.items.some(x=>x.url===url&&x.icon!==icon))return;this.save(this.items.map(x=>x.url===url?{...x,icon}:x));}
 remove(url){url=policy.destination(url);return this.save(this.items.filter(x=>x.url!==url));}
}
module.exports={Bookmarks,apiVersion:1};
