'use strict';
const {destination,name}=require('../src/policy.cjs');
const CAPS=new Set(['theme','ui.shortcuts','ui.panel']);
function validatePlugin(p){if(!p||p.apiVersion!==1||typeof p.id!=='string'||!/^[a-z][a-z0-9.-]{2,48}$/.test(p.id)||typeof p.title!=='string'||p.title.length>60||!Array.isArray(p.capabilities)||p.capabilities.length>3||p.capabilities.some(c=>!CAPS.has(c)))throw Error('Unsupported plugin manifest or capability');
 const out={apiVersion:1,id:p.id,title:p.title,capabilities:[...new Set(p.capabilities)]};
 if(p.theme){if(!out.capabilities.includes('theme'))throw Error('Missing theme capability');out.theme={};for(const k of Object.keys(p.theme)){if(!['accent','background'].includes(k)||!/^#[a-fA-F0-9]{6}$/.test(p.theme[k]))throw Error('Invalid theme token');out.theme[k]=p.theme[k];}}
 if(p.panel){if(!out.capabilities.includes('ui.panel')||typeof p.panel!=='string'||p.panel.length>1000)throw Error('Invalid panel');out.panel=p.panel;}
 if(p.shortcuts){if(!out.capabilities.includes('ui.shortcuts')||!Array.isArray(p.shortcuts)||p.shortcuts.length>8)throw Error('Invalid shortcuts');out.shortcuts=p.shortcuts.map(s=>{if(typeof s.title!=='string'||s.title.length>60||typeof s.address!=='string')throw Error('Invalid shortcut');if(s.address.startsWith('woo://'))name(s.address.slice(6));else destination(s.address);return {title:s.title,address:s.address};});}
 const known=new Set(['apiVersion','id','title','capabilities','theme','panel','shortcuts']);if(Object.keys(p).some(k=>!known.has(k)))throw Error('Executable/unknown plugin fields rejected');return out;
}
function authorizePlugin(p,granted){const plugin=validatePlugin(p);if(!Array.isArray(granted)||plugin.capabilities.some(c=>!granted.includes(c)))throw Error('Plugin permission denied');return plugin;}
module.exports={validatePlugin,authorizePlugin};
