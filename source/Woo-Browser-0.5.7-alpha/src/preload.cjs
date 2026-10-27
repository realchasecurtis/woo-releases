'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const actions=new Set(['page-blocked-link-open','bookmark-command','bookmark-overlay','downloads-open','downloads-close','downloads-clear','download-cancel','publishing-test','settings-size','discover','settings-popover','settings-command','motion','preview-tab','project-select','project-relink','project-preview','window-minimize','window-maximize','window-close','bookmark-toggle','bookmark-edit','bookmark-remove','bookmarks-open','setup-open','default-search','setup-folder','setup-cancel','setup-check','setup-create','host-start','host-stop','docs-open','docs-read','docs-copy','docs-download','theme','trust-recover','search','tab-new','tab-select','tab-close','search-provider','suggestions','update-check','update-download','state','go','home','back','forward','reload','panel','close-panel','settings','put','remove','export','import','host-demo','host-open','registry-resume','host-folder','host-refresh','owner-confirm','host-checkin','plugin-install','plugin-remove']);
contextBridge.exposeInMainWorld('woo',Object.freeze({
  tabDrag:(action,payload)=>{if(!['geometry','begin','cancel','finish'].includes(action))return Promise.reject(Error('Unsupported drag action'));return ipcRenderer.invoke('woo:tab-drag',action,payload);},
  action:(action,payload)=>{if(!actions.has(action))return Promise.reject(Error('Unsupported action'));return ipcRenderer.invoke('woo:action',action,payload);},
  onMenu:callback=>{ipcRenderer.on('woo:menu-command',(_event,command)=>callback(command));},
  onFocus:callback=>{ipcRenderer.on('woo:focus-address',()=>callback());},
  onState:callback=>{if(typeof callback!=='function')return;ipcRenderer.on('woo:state',(_event,state)=>callback(state));}
}));

