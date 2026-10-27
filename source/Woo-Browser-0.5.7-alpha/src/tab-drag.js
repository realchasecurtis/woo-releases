'use strict';
// Pointer capture keeps an in-progress gesture in trusted chrome across windows.
// No dataTransfer strings, remote page listeners, or URL cloning are used.
(()=>{
 const strip=document.getElementById('tab-strip'),tabs=document.getElementById('tabs');
 strip.addEventListener('dragstart',e=>e.preventDefault());
 let gesture=null,suppressClick=false;
 const send=(name,value)=>window.woo.tabDrag(name,value);
 function geometry(){const r=tabs.getBoundingClientRect(),s=strip.getBoundingClientRect();send('geometry',{left:r.left,right:document.querySelector('.window-controls').getBoundingClientRect().left,top:s.top,bottom:s.bottom,tabs:[...tabs.children].map(t=>{const b=t.getBoundingClientRect();return {id:Number(t.dataset.tabId),mid:(b.left+b.right)/2};})}).catch(()=>{});}
 new ResizeObserver(geometry).observe(tabs);new MutationObserver(geometry).observe(tabs,{childList:true});tabs.addEventListener('scroll',geometry);window.addEventListener('resize',geometry);
 function clear(g){if(gesture===g)gesture=null;strip.classList.remove('tab-dragging');if(strip.hasPointerCapture(g.pointer))strip.releasePointerCapture(g.pointer);}
 async function cancel(){const g=gesture;if(!g)return;clear(g);try{if(g.token)await send('cancel',await g.token);}catch{}}
 strip.addEventListener('pointerdown',e=>{if(e.button!==0||gesture||e.target.closest('.close-tab'))return;const tab=e.target.closest('[data-tab-id]');if(!tab)return;gesture={pointer:e.pointerId,id:Number(tab.dataset.tabId),x:e.clientX,y:e.clientY};strip.setPointerCapture(e.pointerId);});
 strip.addEventListener('pointermove',e=>{const g=gesture;if(!g||g.pointer!==e.pointerId)return;if(!g.token&&Math.hypot(e.clientX-g.x,e.clientY-g.y)>=6){g.token=send('begin',g.id);g.token.catch(()=>{});strip.classList.add('tab-dragging');suppressClick=true;}});
 strip.addEventListener('pointerup',async e=>{const g=gesture;if(!g||g.pointer!==e.pointerId)return;clear(g);if(!g.token){await window.woo.action('tab-select',g.id);return;}try{await send('finish',await g.token);}catch(error){console.warn('Tab move cancelled:',error.message);}});
 strip.addEventListener('pointercancel',cancel);strip.addEventListener('lostpointercapture',()=>{if(gesture)void cancel();});window.addEventListener('keydown',e=>{if(e.key==='Escape'&&gesture){e.preventDefault();void cancel();}},true);
 strip.addEventListener('click',e=>{if(suppressClick){suppressClick=false;e.preventDefault();e.stopImmediatePropagation();}},true);
 window.addEventListener('blur',()=>{if(gesture&&!strip.hasPointerCapture(gesture.pointer))void cancel();});
 geometry();
})();
