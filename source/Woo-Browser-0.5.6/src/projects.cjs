'use strict';
const fs=require('fs'),path=require('path'),{atomic}=require('./registry.cjs'),policy=require('./policy.cjs');
class Projects{
 constructor(dir){this.file=path.join(dir,'projects-v1.json');this.items=[];if(fs.existsSync(this.file)){if(fs.statSync(this.file).size>1024*1024)throw Error('Project catalog exceeds limit');const d=JSON.parse(fs.readFileSync(this.file,'utf8'));if(d.version!==1||!Array.isArray(d.projects)||d.projects.length>200)throw Error('Invalid project catalog');this.items=d.projects.map(x=>this.validate(x));if(new Set(this.items.map(x=>x.id)).size!==this.items.length)throw Error('Duplicate project identity');}}
 validate(x){if(!x||x.id!==policy.name(x.name)||!['starter','folder'].includes(x.source)||typeof x.title!=='string'||x.title.length>120||/[\x00-\x1f]/.test(x.title)||typeof x.contentDirectory!=='string'||!path.isAbsolute(x.contentDirectory)||x.contentDirectory.length>4096||!Number.isSafeInteger(x.updatedAt))throw Error('Invalid project metadata');return {id:x.id,name:x.name,title:x.title,source:x.source,contentDirectory:x.contentDirectory,updatedAt:x.updatedAt};}
 put(x){const item=this.validate(x),next=this.items.filter(p=>p.id!==item.id);if(next.length>=200)throw Error('Maximum 200 recent projects');next.push(item);atomic(this.file,{version:1,projects:next});this.items=next;return item;}
 get(id){const p=this.items.find(p=>p.id===id);if(!p)throw Error('Unknown saved project');return p;}
 list(){return [...this.items].sort((a,b)=>b.updatedAt-a.updatedAt).map(p=>({...p,folderAvailable:fs.existsSync(path.join(p.contentDirectory,'index.html'))}));}
}
module.exports={Projects,apiVersion:1};
