'use strict';
// Session-only navigation journal. Never deserialize entries from pages or disk.
class NavigationJournal{
 constructor(){this.entries=[{kind:'internal',state:{page:'home'},title:'New tab'}];this.cursor=0;}
 get current(){return this.entries[this.cursor];}get canBack(){return this.cursor>0;}get canForward(){return this.cursor<this.entries.length-1;}
 push(entry){this.entries.splice(this.cursor+1);this.entries.push(entry);if(this.entries.length>200)this.entries.shift();this.cursor=this.entries.length-1;}
 internal(state,title){const safe={};for(const k of ['page','query','results','scope','doc','docList','project','url','origin','wooName'])if(state[k]!==undefined)safe[k]=state[k];if(this.current.kind==='internal'&&JSON.stringify(this.current.state)===JSON.stringify(safe))return;this.push({kind:'internal',state:safe,title});}
 web(index,url){const current=this.current;if(current.kind==='web'&&current.index===index){current.url=url;return;}const existing=this.entries.findIndex(e=>e.kind==='web'&&e.index===index&&e.url===url);if(existing>=0){this.cursor=existing;return;}this.push({kind:'web',index,url});}
 move(delta){const i=this.cursor+delta;if(i<0||i>=this.entries.length)return null;this.cursor=i;return this.current;}
}
module.exports={NavigationJournal,apiVersion:1};
