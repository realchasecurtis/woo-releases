'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
exports.run=async c=>{
 const results=[];const file=path.join(c.dir,'ui-results.json');
 async function check(name,fn){try{await fn();results.push({name,pass:true});}catch(e){results.push({name,pass:false,error:e.stack});}fs.writeFileSync(file,JSON.stringify({versions:process.versions,results},null,2));}
 async function settle(){for(let i=0;i<100&&c.view.webContents.isLoading();i++)await wait(100);await wait(250);}
 const ui=code=>c.win.webContents.executeJavaScript(code);
 await check('packaged shell and trusted UI controls',async()=>{assert.equal(await ui('typeof window.woo.action'),'function');assert.equal(await ui('typeof require'),'undefined');assert.equal(await ui('document.querySelectorAll(".card").length'),5);});
 async function capture(filename){await ui('document.fonts.ready.then(()=>true)');await wait(500);for(let i=0;i<3;i++){try{fs.writeFileSync(path.join(c.dir,filename),(await c.win.webContents.capturePage()).toPNG());return;}catch(e){if(i===2)throw e;await wait(500);}}}
 await check('home screenshot',async()=>{await capture('home.png');});
 await check('custom name resolves to HTTPS and visible origin',async()=>{await c.navigate('example.woo');await settle();assert.equal(c.state().page,'web',c.state().message);assert.equal(c.view.webContents.getURL(),'https://example.com/');assert.equal(c.state().wooName,'example.woo');assert.equal(c.state().origin,'https://example.com');assert.match(await ui('document.getElementById("identity").textContent'),/Actual origin: https:\/\/example.com/);});
 await check('remote content isolation',async()=>{const info=await c.view.webContents.executeJavaScript('({require:typeof require,process:typeof process,woo:typeof woo,electron:typeof electron})');assert.deepEqual(info,{require:'undefined',process:'undefined',woo:'undefined',electron:'undefined'});const prefs=c.view.webContents.getLastWebPreferences();assert.equal(prefs.sandbox,true);assert.equal(prefs.contextIsolation,true);assert.equal(prefs.nodeIntegration,false);});
 await check('ordinary HTTPS navigation',async()=>{await c.navigate('https://example.org/');await settle();assert.equal(c.state().page,'web',c.state().message);assert.equal(c.state().origin,'https://example.org');assert.equal(c.state().wooName,'');});
 await check('back forward and reload via UI IPC',async()=>{await ui('window.woo.action("back")');await settle();assert.equal(c.view.webContents.getURL(),'https://example.com/');await ui('window.woo.action("forward")');await settle();assert.equal(c.view.webContents.getURL(),'https://example.org/');await ui('window.woo.action("reload")');await settle();assert.equal(c.state().page,'web');assert.equal(c.state().origin,'https://example.org');});
 await check('popups blocked',async()=>{await c.view.webContents.executeJavaScript('window.open("https://example.com")');await wait(300);assert.match(c.state().message,/Popup blocked/);});
 await check('downloads blocked',async()=>{c.view.webContents.downloadURL('https://example.com/');for(let i=0;i<80&&!c.state().message.includes('Downloads');i++)await wait(100);assert.match(c.state().message,/Downloads are blocked/);});
 await check('website permissions denied',async()=>{assert.equal(await c.view.webContents.executeJavaScript('Notification.requestPermission()'),'denied');});
 await check('invalid TLS certificate is rejected',async()=>{await c.navigate('https://expired.badssl.com/');await settle();assert.equal(c.state().page,'error');assert.match(c.state().message,/CERT/);await c.navigate('https://example.org/');await settle();});
 await check('unsafe navigation cannot load file URL',async()=>{await c.navigate('file:///C:/Windows/win.ini');assert.equal(c.state().page,'error');assert.equal(c.view.webContents.getURL(),'https://example.org/');});
 await check('missing and malformed Woo names show errors',async()=>{await c.navigate('woo://missing.bunker');assert.equal(c.state().page,'error');assert.match(c.state().message,/not registered/);await c.navigate('woo://../bad');assert.equal(c.state().page,'error');});
 await check('registry outage is explicit and no fallback to web',async()=>{await ui('window.woo.action("settings","http://127.0.0.1:1")');await c.navigate('example.woo');assert.equal(c.state().page,'error');assert.match(c.state().message,/ECONNREFUSED/);await ui('window.woo.action("settings","")');});
 await check('operator UI writes a persistent registration',async()=>{await ui('window.woo.action("panel")');const r=await ui('window.woo.action("put",{replace:false,record:{name:"ui.bunker",destination:"https://example.com/",owner:"test",note:"UI test"}})');assert.equal(r.ok,true);assert.equal(c.registry.get('ui.bunker').owner,'test');await ui('window.woo.action("remove","ui.bunker")');});
 await check('settings screenshot',async()=>{await capture('settings.png');});
 c.app.exit(results.every(r=>r.pass)?0:1);
};
