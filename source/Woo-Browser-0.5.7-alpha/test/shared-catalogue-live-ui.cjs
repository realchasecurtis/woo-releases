'use strict';
// Opt-in LIVE GUI verification. Never supplies catalogue/content fixtures or fallbacks.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
exports.run=async({app,win,tabs,registry,foundation,sharedCatalogue,sharedRecords,dir})=>{
 const source='https://raw.githubusercontent.com/realchasecurtis/woo-releases/main/network/catalogue-v1.json';
 const expected='https://raw.githubusercontent.com/realchasecurtis/woo-releases/main/network/welcome.txt';
 const inspectDocument=async(wc,reload=false)=>{const d=wc.debugger;d.attach('1.3');let response;const listener=(_e,method,p)=>{if(method==='Network.responseReceived'&&p.response.url===expected)response=p.response;};d.on('message',listener);try{await d.sendCommand('Network.enable');if(reload){await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Inspection reload deadline')),15000);wc.once('did-finish-load',()=>{clearTimeout(timer);resolve();});wc.reload();});}const {root}=await d.sendCommand('DOM.getDocument',{depth:-1});const text=[];function walk(n){if(n.nodeType===3)text.push(n.nodeValue);for(const child of n.children||[])walk(child);}walk(root);const prefs=wc.getLastWebPreferences();const result={text:text.join('').trim(),documentURL:root.documentURL,response:response?{url:response.url,mimeType:response.mimeType,headers:response.headers}:null,preferences:{sandbox:prefs.sandbox,contextIsolation:prefs.contextIsolation,nodeIntegration:prefs.nodeIntegration},runtimeTypeofProbes:'NOT RUN: response CSP sandbox forbids scripts'};fs.writeFileSync(path.join(dir,'remote-dom-evidence.json'),JSON.stringify(result,null,2));fs.writeFileSync(path.join(dir,'welcome-rendered.png'),(await wc.capturePage()).toPNG());return result;}finally{d.removeListener('message',listener);d.detach();}};
 const receipts=[], failures=[];let sequence=0;
 const save=()=>fs.writeFileSync(path.join(dir,'operation-receipts.json'),JSON.stringify({receipts,failures},null,2));
 const evaluate=async(wc,expression)=>{const receipt={id:++sequence,url:wc.getURL(),expression,status:'started'};receipts.push(receipt);save();try{
 const wrapped='(async()=>{try{return {ok:true,value:await ('+expression+')}}catch(e){return {ok:false,error:{name:String(e?.name),message:String(e?.message),stack:String(e?.stack)}}}})()';
 new (require('node:vm').Script)(wrapped);
 const r=await wc.executeJavaScript(wrapped);receipt.result=r;receipt.status=r.ok?'passed':'renderer-exception';save();if(!r.ok)throw Error(JSON.stringify(r.error));return r.value;
 }catch(e){receipt.status='failed';receipt.error=String(e.stack||e);save();throw e;}};
 const submitAddress=async()=>{win.focus();win.webContents.focus();await evaluate(win.webContents,"(()=>{const input=document.getElementById('address');input.focus();input.select();return document.activeElement===input;})()");await win.webContents.insertText('welcome.woo');assert.equal(await evaluate(win.webContents,"document.getElementById('address').value"),'welcome.woo');win.webContents.sendInputEvent({type:'keyDown',keyCode:'Enter'});win.webContents.sendInputEvent({type:'char',keyCode:'\r'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Enter'});await wait(150);};
 const recordFailure=(group,e)=>{failures.push({group,error:String(e.stack||e)});save();};
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 // Launcher starts hidden by policy. First ShowWindow can inherit that state;
 // explicitly show again after the first event-loop turn before visibility checks.
 win.show();await wait(100);win.show();if(win.isMinimized())win.restore();
 const visibleDeadline=Date.now()+5000;while(!win.isVisible()&&Date.now()<visibleDeadline){win.show();await wait(100);}
 fs.writeFileSync(path.join(dir,'visibility.json'),JSON.stringify({visible:win.isVisible(),minimized:win.isMinimized()},null,2));
 try {
 await sharedCatalogue.ensure();assert.equal(sharedCatalogue.status().state,'ready');assert.equal(sharedCatalogue.status().source,source);
 assert.equal(registry.get('welcome.woo'),undefined,'Must not use a local alias');assert.equal(foundation.registry.records.has('welcome.woo'),false,'Must not use native local content');
 assert.equal(sharedRecords().find(r=>r.name==='welcome.woo')?.destination,expected);
 await submitAddress();
 const deadline=Date.now()+20000;while((tabs.state.loading||tabs.state.page!=='web')&&Date.now()<deadline){if(tabs.state.page==='error')throw Error(tabs.state.message);await wait(100);}
 assert.equal(tabs.state.page,'web');assert.equal(tabs.state.loading,false);assert.equal(tabs.active.hidden,false);assert.equal(win.isVisible(),true);
 const wc=tabs.active.view.webContents;assert.equal(wc.getURL(),expected);assert.equal(tabs.state.origin,'https://raw.githubusercontent.com');assert.equal(tabs.state.wooName,'welcome.woo');
 const content=await inspectDocument(wc,true);assert.equal(content.text,'Hello world!');assert.equal(content.response.mimeType,'text/plain');assert.equal(content.preferences.sandbox,true);assert.equal(content.preferences.contextIsolation,true);assert.equal(content.preferences.nodeIntegration,false);
 const identity=await evaluate(win.webContents,"document.getElementById('identity').textContent");assert.match(identity,/Actual origin: https:\/\/raw\.githubusercontent\.com/);
 // Repeat through actual address input and Enter event; never dispatch go directly.
 await submitAddress();
 const secondDeadline=Date.now()+20000;while(tabs.state.loading&&Date.now()<secondDeadline)await wait(100);
 assert.equal(tabs.state.page,'web');assert.equal(tabs.state.loading,false);assert.equal(wc.getURL(),expected);assert.equal((await inspectDocument(wc)).text,'Hello world!');
 const displayedAddress=await evaluate(win.webContents,"document.getElementById('address').value");assert.equal(displayedAddress,expected);
 fs.writeFileSync(path.join(dir,'app-window.png'),(await win.capturePage()).toPNG());
 fs.writeFileSync(path.join(dir,'shared-live-results.json'),JSON.stringify({pass:true,checkedAt:new Date().toISOString(),platform:process.platform,electron:process.versions.electron,catalogue:sharedCatalogue.status(),actualURL:wc.getURL(),actualOrigin:tabs.state.origin,identity,content,localAlias:false,localNative:false,publicContentOnly:true,addressInputAndEnter:true,displayedAddress,packaged:app.isPackaged,version:app.getVersion()},null,2));
 }catch(e){recordFailure('live-content-navigation-isolation',e);}
 const themeResults=[];try {
 await evaluate(win.webContents,"window.woo.action('settings-popover',true)");
 const settings=require('electron').BrowserWindow.getAllWindows().find(w=>w!==win&&w.webContents.getURL().includes('settings-popover.html'));
 assert.ok(settings);
 for(const theme of ['light','dark']){
  await evaluate(win.webContents,`window.woo.action('theme','${theme}')`);await wait(150);
  const paint=await evaluate(settings.webContents,`(()=>{const s=document.getElementById('default-search');s.focus();const c=getComputedStyle(s),o=getComputedStyle(s.options[0]);return {theme:document.documentElement.dataset.theme,color:c.color,background:c.backgroundColor,scheme:c.colorScheme,optionColor:o.color,optionBackground:o.backgroundColor,focused:document.activeElement===s,outline:c.outlineColor};})()`);
  assert.equal(paint.theme,theme);assert.equal(paint.scheme,theme);assert.equal(paint.focused,true);
  assert.equal(paint.color,theme==='light'?'rgb(24, 32, 44)':'rgb(237, 246, 251)');assert.equal(paint.background,theme==='light'?'rgb(240, 243, 248)':'rgb(18, 34, 45)');assert.equal(paint.optionColor,paint.color);assert.equal(paint.optionBackground,paint.background);
  fs.writeFileSync(path.join(dir,'settings-'+theme+'.png'),(await settings.webContents.capturePage()).toPNG());themeResults.push(paint);
 }
 fs.writeFileSync(path.join(dir,'theme-results.json'),JSON.stringify({pass:true,control:'Settings Search when I press Enter; homepage Search in absent',themeResults,nativeExpandedPopup:'not visually verified',forcedColors:'not tested'},null,2));
 }catch(e){recordFailure('themes',e);}
 fs.writeFileSync(path.join(dir,'combined-results.json'),JSON.stringify({pass:failures.length===0,failures,receipts:receipts.length},null,2));
 if(failures.length){app.exit(1);return;}
 app.quit();
};

