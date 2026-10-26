'use strict';
const {app,BrowserWindow,WebContentsView,ipcMain,session,dialog,protocol,powerMonitor,Menu,clipboard,screen,shell}=require('electron');
protocol.registerSchemesAsPrivileged([{scheme:'woo-site',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true,allowServiceWorkers:false,bypassCSP:false}}]);
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const policy=require('./policy.cjs');
const {Registry,serve,remoteResolve,atomic}=require('./registry.cjs');
const {startProxy}=require('./proxy.cjs');
const branding=require('./branding.cjs');
const arg=k=>process.argv.find(x=>x.startsWith('--'+k+'='))?.slice(k.length+3);
const dataDir=arg('data-dir');
if(dataDir)app.setPath('userData',path.resolve(dataDir));
branding.configureBranding(app);
if(!dataDir)app.setPath('userData',path.join(app.getPath('appData'),branding.PROFILE_DIRECTORY));
app.enableSandbox();
app.commandLine.appendSwitch('disable-quic');
app.commandLine.appendSwitch('force-webrtc-ip-handling-policy','disable_non_proxied_udp');
if(!process.argv.includes('--serve-registry')&&!app.requestSingleInstanceLock())app.quit();
else app.whenReady().then(start).catch(e=>{console.error(e);app.exit(1);});
async function start(){if((process.argv.includes('--usability-test')||process.argv.includes('--release-test')||process.argv.includes('--motion-test')||process.argv.includes('--everyday-test')||process.argv.includes('--patch044-test')||process.argv.includes('--experimental-test')||process.argv.includes('--settings053-test'))&&!dataDir)throw Error('Release checks require an explicit disposable --data-dir.');
  Menu.setApplicationMenu(null);
  const devClaims=!app.isPackaged&&process.argv.includes('--fixture-claims');
  const dir=app.getPath('userData'),registry=new Registry(dir,{allowNewRegistrations:devClaims});
  if(!app.isPackaged&&process.argv.includes('--lifecycle-demo')){fs.writeFileSync(path.join(dir,'lifecycle-simulation.json'),JSON.stringify(require('../examples/lifecycle.cjs').run(),null,2));app.quit();return;}
  if(process.argv.includes('--serve-registry')){
    const port=Number(arg('port')||47831);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Port must be 1024–65535');
    const server=serve(registry,port);server.on('error',e=>{console.error(e);app.exit(1);});
    app.on('before-quit',()=>server.close());return;
  }
  const settingsFile=path.join(dir,'settings.json');let savedSettings={};try{savedSettings=JSON.parse(fs.readFileSync(settingsFile,'utf8'));}catch{}const settings=require('./settings.cjs').load(savedSettings);
  const proxy=await startProxy();
  const browsing=session.fromPartition('persist:woo-web');
  await browsing.setProxy({mode:'fixed_servers',proxyRules:'http=127.0.0.1:'+proxy.port+';https=127.0.0.1:'+proxy.port,proxyBypassRules:'<-loopback>'});
  browsing.setPermissionRequestHandler((_w,_p,cb)=>cb(false));
  browsing.setPermissionCheckHandler(()=>false);
  browsing.on('will-download',(event,_item,wc)=>{event.preventDefault();const owner=tabs.tabs.find(t=>t.view.webContents===wc);if(owner)owner.state.message='Downloads are blocked in this prototype.';emit();});
  browsing.webRequest.onBeforeRequest((details,callback)=>{
    // Internal in-memory resources are allowed only as subresources, never as pages.
    if(['image','font','media','stylesheet','script','other'].includes(details.resourceType) && /^(data:|blob:)/.test(details.url))return callback({});
    try {policy.destination(details.url.replace(/^wss:/,'https:'));callback({});}catch{callback({cancel:true});}
  });
  const trusted=pathToFileURL(path.join(__dirname,'index.html')).href;
  const win=new BrowserWindow({width:1280,height:860,minWidth:900,minHeight:640,title:'Woo',frame:false,icon:path.join(__dirname,'assets','woo-icon.png'),backgroundColor:'#0b1322',show:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,webviewTag:false}});
  const bookmarks=new (require('./bookmarks.cjs').Bookmarks)(dir);
  const experiment=new (require('./experimental/adapter.cjs').Experiment)();const selectedFiles=new (require('./experimental/selected-file.cjs').SelectedFileReader)();let importController=null;const cancelImport=()=>importController?.abort();let experimentWin=null;const experimentURL=pathToFileURL(path.join(__dirname,'experimental.html')).href;
  async function openExperiment(){if(experimentWin){experimentWin.focus();return;}const w=experimentWin=new BrowserWindow({parent:win,width:820,height:760,title:'Woo experimental foundations',show:false,webPreferences:{preload:path.join(__dirname,'experimental-preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,webviewTag:false}});w.webContents.on('will-navigate',e=>e.preventDefault());w.webContents.setWindowOpenHandler(()=>({action:'deny'}));w.on('closed',()=>{experimentWin=null;cancelImport();experiment.close();});await w.loadFile(path.join(__dirname,'experimental.html'));if(!w.isDestroyed())w.show();}
  let settingsBlurredAt=0;let settingsHeight=580;let settingsWin=null;const settingsURL=pathToFileURL(path.join(__dirname,'settings-popover.html')).href;
  const foundation=await require('./foundation.cjs').createFoundation({dir,parent:win,allowNewClaims:devClaims});
  powerMonitor.on('suspend',()=>{foundation.pause();emit();});
  foundation.onChange(()=>emit());
  const buildInfo=require('./build-info.cjs').read(app);const trust=require('./update-trust.json');
  const updates=new (require('./updates.cjs').UpdateChecker)({config:trust.endpoint&&trust.publicKey?trust:null,current:app.getVersion(),changed:()=>emit(),floorFile:path.join(dir,'trust','update-floor.json')});
  let plugin=null;
  const tabs=new (require('./browser-tabs.cjs').BrowserTabs)({win,session:browsing,resolve:resolveAddress,onChange:emit,onPageFocus:()=>settingsWin?.close(),onIcon:(url,icon)=>{try{bookmarks.setIcon(url,icon);}catch{}},onNative:n=>foundation.open(n),isNative:input=>!!require('./address-resolution.cjs').nativeName(input,n=>foundation.registry.records.has(n))});
  tabs.bookmarkHeight=bookmarks.items.length?32:0;
  win.on('maximize',emit);win.on('unmaximize',emit);
  const discovery=require('../sdk/discovery.cjs').createProvider({readRegistry:()=>registry.list(),readPublished:()=>foundation.status().records});
  function shortcut(input){try{const k=input.key?.toLowerCase();if(input.type!=='keyDown')return false;if(input.alt&&['arrowleft','arrowright'].includes(k)){tabs.history(k==='arrowleft'?'back':'forward');return true;}if(input.control&&k==='l'){win.webContents.focus();win.webContents.send('woo:focus-address');return true;}if(input.control&&k==='t'){tabs.add();win.webContents.focus();win.webContents.send('woo:focus-address');return true;}if(input.control&&k==='w'){tabs.close(tabs.activeId);return true;}if(input.control&&k==='tab'){const i=tabs.tabs.findIndex(t=>t.id===tabs.activeId),d=input.shift?-1:1;tabs.select(tabs.tabs[(i+d+tabs.tabs.length)%tabs.tabs.length].id);return true;}if(input.control&&/^[1-9]$/.test(k)){tabs.select(tabs.tabs[k==='9'?tabs.tabs.length-1:Math.min(Number(k)-1,tabs.tabs.length-1)].id);return true;}if(k==='f5'||input.control&&k==='r'){tabs.reload();return true;}return false;}catch(e){tabs.state.message=e.message;emit();return true;}}tabs.onShortcut=shortcut;win.webContents.on('before-input-event',(event,input)=>{if(shortcut(input))event.preventDefault();});
  function bounds(){tabs.layout();}
  function visible(show){tabs.setVisible(show);}
  function emit(){if(settingsWin&&!settingsWin.isDestroyed())settingsWin.webContents.send('woo:state',{...settings,buildInfo,updates:updates.snapshot()});if(!win.isDestroyed())win.webContents.send('woo:state',{...tabs.state,settingsOpen:!!settingsWin,bookmarks:bookmarks.items,motion:settings.motion,codeInternal:codeIsInternal(),reserved:require('../sdk/namespace.cjs').names.map(name=>({name,conflict:registry.read().records.some(r=>r.name===name)||foundation.registry.records.has(name)})),maximized:win.isMaximized(),endpoint:settings.endpoint,searchProvider:settings.searchProvider,theme:settings.theme,defaultSearch:settings.defaultSearch,tabs:tabs.snapshot(),updates:updates.snapshot(),plugin,foundation:foundation.status(),records:registry.list()});}
  function docsOpen(){if(tabs.active.native)tabs.add();tabs.internal('docs',{doc:require('./documentation.cjs').read('ai-setup'),docList:require('./documentation.cjs').list()});}
  const previewPending=new Map();
  async function previewTab(name,background=true){const existing=tabs.tabs.find(t=>t.native?.record.name===name&&t.view.webContents&&!t.view.webContents.isDestroyed()&&t.state.page==='native');if(existing){if(!background)tabs.select(existing.id);return {tabId:existing.id,reused:true};}if(previewPending.has(name))return previewPending.get(name);if(tabs.tabs.length>=tabs.maxTabs)throw Error('Close a tab before opening a preview');const promise=(async()=>{const item=await foundation.open(name,{embedded:true});try{const t=tabs.adoptNative(item,{background});return {tabId:t.id};}catch(e){item.dispose();throw e;}})();previewPending.set(name,promise);try{return await promise;}finally{previewPending.delete(name);}}
  function codeIsInternal(){const old=registry.read().records.find(r=>r.name==='code.woo');return !foundation.registry.records.has('code.woo')&&(!old||(old.owner==='woo-builtin'&&old.destination==='https://developer.mozilla.org/en-US/'&&old.note==='Reserved built-in HTTPS shortcut, not a native hosted site.'));}
  const navigate=input=>{const n=typeof input==='string'?input.trim().toLowerCase().replace(/^woo:\/\//,''):'';if(n==='code.woo'&&codeIsInternal()){docsOpen();return Promise.resolve();}const native=require('./address-resolution.cjs').nativeName(input,name=>foundation.registry.records.has(name));if(native)return previewTab(native,false);if(require('../sdk/namespace.cjs').isReserved(n)&&!registry.get(n)&&!foundation.registry.records.has(n)){tabs.showSearch(n,[],'Reserved built-in Woo name. Destination not yet configured; no request was sent.');return Promise.resolve();}if(typeof input==='string'&&!require('./web-search.cjs').isAddress(input.trim())){if(settings.defaultSearch==='web'&&input.trim())return tabs.navigate(require('./web-search.cjs').searchURL(input,settings.searchProvider));tabs.showSearch(input.trim(),discovery.search(input),discovery.scope);return Promise.resolve();}return tabs.navigate(input);};
  async function resolveAddress(input){const result=await require('./address-resolution.cjs').resolveTarget(input,{registry,endpoint:settings.endpoint,remoteResolve,searchProvider:settings.searchProvider});await policy.publicAddress(new URL(result.url).hostname);return result;}
  win.webContents.on('will-navigate',e=>e.preventDefault());win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-attach-webview',e=>e.preventDefault());
  function positionSettings(){if(settingsWin&&!settingsWin.isDestroyed()){const b=win.getBounds(),area=screen.getDisplayMatching(b).workArea,width=Math.min(380,area.width-16),height=Math.min(Math.ceil(settingsHeight*settingsWin.webContents.getZoomFactor()),area.height-16);settingsWin.setBounds({x:Math.max(area.x+8,Math.min(b.x+b.width-width-8,area.x+area.width-width-8)),y:Math.max(area.y+8,Math.min(b.y+84,area.y+area.height-height-8)),width,height});}}
  async function settingsPopover(open){if(open&&!settingsWin&&Date.now()-settingsBlurredAt<150){settingsBlurredAt=0;return;}if(!open){settingsWin?.close();win.webContents.send('woo:menu-command','focus-settings');return;}if(settingsWin){settingsWin.focus();return;}settingsWin=new BrowserWindow({parent:win,frame:false,show:false,width:380,height:580,resizable:false,skipTaskbar:true,backgroundColor:'#09131a',webPreferences:{preload:path.join(__dirname,'preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,webviewTag:false}});const popup=settingsWin;popup.webContents.on('will-navigate',e=>e.preventDefault());popup.webContents.setWindowOpenHandler(()=>({action:'deny'}));popup.on('blur',()=>{settingsBlurredAt=Date.now();popup.close();});popup.on('closed',()=>{if(settingsWin===popup)settingsWin=null;emit();});popup.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&input.key==='Escape'){event.preventDefault();popup.close();win.focus();win.webContents.send('woo:menu-command','focus-settings');return;}if(shortcut(input)){event.preventDefault();popup.close();}});positionSettings();await popup.loadFile(path.join(__dirname,'settings-popover.html'));if(!popup.isDestroyed()){popup.show();emit();}}
  win.on('focus',()=>{if(settingsWin&&!settingsWin.isFocused())settingsWin.close();});win.on('move',positionSettings);win.on('resize',positionSettings);
  function sender(event,action){if(experimentWin&&event.sender===experimentWin.webContents&&event.senderFrame===experimentWin.webContents.mainFrame&&event.senderFrame.url===experimentURL){if(!['experiment-status','experiment-enable','experiment-import','experiment-search','experiment-agent','experiment-close'].includes(action))throw Error('Experimental action not permitted');return;}if(action.startsWith('experiment-'))throw Error('Experimental panel required');if(settingsWin&&event.sender===settingsWin.webContents&&event.senderFrame===settingsWin.webContents.mainFrame&&event.senderFrame.url===settingsURL){if(!['settings-size','state','settings-popover','settings-command','theme','motion','default-search','search-provider','update-check','update-download'].includes(action))throw Error('Settings action not permitted');return;}
if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame||event.senderFrame.url!==trusted)throw Error('Untrusted IPC sender');}
  ipcMain.handle('woo:action',async(event,action,payload)=>{
    sender(event,action);
    try{
      switch(action){
        case 'settings-size':if(!settingsWin||event.sender!==settingsWin.webContents||!Number.isFinite(payload)||payload<100||payload>5000)throw Error('Invalid menu size');settingsHeight=payload;positionSettings();return {ok:true};
        case 'experiment-status':return {ok:true,status:experiment.status()};
        case 'experiment-enable':if(payload===false)cancelImport();return {ok:true,status:await experiment.enable(payload)};
        case 'experiment-search':return {ok:true,rows:experiment.search(payload),status:experiment.status()};
        case 'experiment-agent':return {ok:true,output:await experiment.agent(payload)};
        case 'experiment-close':experimentWin?.close();return {ok:true};
        case 'experiment-import':{experiment.require();if(importController||selectedFiles.busy)throw Error('An import is already pending');const controller=importController=new AbortController(),epoch=experiment.epoch;try{const choice=await dialog.showOpenDialog(experimentWin,{title:'Import local public signed bundle into memory only',properties:['openFile'],filters:[{name:'Woo public envelope',extensions:['json']}]});if(controller.signal.aborted||epoch!==experiment.epoch)throw Error('Import cancelled');if(choice.canceled)return {ok:true,status:experiment.status()};return {ok:true,status:await require('./experimental/selected-file.cjs').readAndImport(experiment,selectedFiles,choice.filePaths[0],{signal:controller.signal})};}finally{if(importController===controller)importController=null;}}


        case 'settings-popover':if(typeof payload!=='boolean')throw Error('Invalid menu state');await settingsPopover(payload);break;
        case 'settings-command':if(!['create','creator','docs','bookmarks','experiment','about','latest'].includes(payload))throw Error('Unknown menu action');settingsWin?.close();if(payload==='latest'){await require('./latest-version.cjs').openLatestVersion(payload,url=>shell.openExternal(url));}else if(payload==='about')await dialog.showMessageBox(win,{type:'info',title:'About Woo & Privacy',message:'Woo '+buildInfo.version,detail:require('./build-info.cjs').description(buildInfo),buttons:['Done']});else if(payload==='experiment')await openExperiment();else win.webContents.send('woo:menu-command',payload);break;
        case 'window-minimize':win.minimize();break;
        case 'window-maximize':if(win.isMaximized())win.unmaximize();else win.maximize();emit();break;
        case 'window-close':win.close();break;
        case 'bookmark-toggle':{const t=tabs.active;if(t.state.page!=='web'||t.state.loading)throw Error('Open a website before bookmarking');const url=policy.destination(t.view.webContents.getURL());bookmarks.toggle(url,t.title,t.favicon);tabs.bookmarkHeight=bookmarks.items.length?32:0;tabs.layout();emit();break;}
        case 'bookmark-edit':bookmarks.edit(payload?.url,payload?.title);emit();break;
        case 'bookmark-remove':bookmarks.remove(payload);tabs.bookmarkHeight=bookmarks.items.length?32:0;tabs.layout();emit();break;
        case 'bookmarks-open':tabs.internal('bookmarks');break;

        case 'suggestions':if(typeof payload!=='boolean')throw Error('Invalid suggestion state');if(['web','native'].includes(tabs.state.page))visible(!payload);break;
        case 'update-check':await updates.check();emit();break;
        case 'update-download':{const release=updates.release;if(!release)throw Error('No authenticated update available');const choice=await dialog.showSaveDialog(win,{title:'Save verified Woo ZIP; install manually',defaultPath:'Woo-'+release.version+'-Windows-x64.zip',filters:[{name:'ZIP',extensions:['zip']}]});if(!choice.canceled){const result=await updates.download();fs.writeFileSync(choice.filePath,result.bytes,{flag:'wx'});tabs.state.message='Verified update saved. Extract manually to a new folder after closing Woo.';emit();}break;}
        case 'default-search':if(!['woo','web'].includes(payload))throw Error('Choose Woo sites or regular web');settings.defaultSearch=payload;settings.searchScopeChosen=true;atomic(settingsFile,settings);emit();break;
        case 'setup-open':if(tabs.active.native)tabs.add();tabs.internal('setup');break;
        case 'motion':if(typeof payload!=='boolean')throw Error('Invalid motion preference');settings.motion=payload;atomic(settingsFile,settings);emit();break;
        case 'preview-tab':{const name=policy.name(payload);return {ok:true,...await previewTab(name,true)};}
        case 'project-select':{const project=foundation.selectProject(payload);if(tabs.active.native)tabs.add();tabs.internal('project',{project});break;}
        case 'project-relink':{const result=await foundation.relinkProject(payload);if(!result.canceled)tabs.state.project=foundation.selectProject(payload);emit();return {ok:true,...result};}
        case 'project-preview':return {ok:true,...await previewTab(policy.name(payload),true)};
        case 'setup-folder':return {ok:true,...await foundation.selectFolder()};
        case 'setup-cancel':foundation.cancelSetup();break;
        case 'setup-check':{const n=require('../sdk/onboarding.cjs').siteName(payload?.label,payload?.ending);return {ok:true,name:n,exists:foundation.registry.records.has(n)||!!registry.get(n),scope:'this local profile only'};}
        case 'setup-create':{const n=require('../sdk/onboarding.cjs').siteName(payload?.label,payload?.ending);if(registry.get(n))throw Error('That name is already used by a local web shortcut. Choose another name.');const result=await foundation.createSite(payload);emit();return {ok:true,...result};}
        case 'host-start':await foundation.start();emit();break;
        case 'host-stop':await foundation.stop();emit();break;
        case 'docs-open':docsOpen();break;
        case 'docs-read':tabs.state.doc=require('./documentation.cjs').read(payload);emit();break;
        case 'docs-copy':clipboard.writeText(require('./documentation.cjs').combined());return {ok:true,message:'AI documentation copied. No profile data or secrets included.'};
        case 'docs-download':{const choice=await dialog.showSaveDialog(win,{title:'Save Woo AI documentation bundle',defaultPath:'Woo-AI-Docs-0.5.0.zip',filters:[{name:'ZIP',extensions:['zip']}]});if(!choice.canceled)fs.copyFileSync(path.join(__dirname,'ai-docs.zip'),choice.filePath,fs.constants.COPYFILE_EXCL);return {ok:true,canceled:choice.canceled};}
        case 'trust-recover':{const answer=await dialog.showMessageBox(win,{type:'warning',title:'Local trust recovery',message:'Recover the local ownership checkpoint?',detail:'Restore the checkpoint matching the durable trust backup. For an older profile without a trust baseline, this explicitly adopts its existing local metadata; it does not authenticate a remote owner. If trust files conflict, recovery stops. Keep a backup first. No signing keys are created.',buttons:['Cancel','Recover / adopt local baseline'],defaultId:0,cancelId:0});if(answer.response===1)await foundation.recover({confirmed:true});emit();break;}
        case 'theme':if(!['light','dark','system'].includes(payload))throw Error('Invalid theme');settings.theme=payload;atomic(settingsFile,settings);emit();break;
        case 'host-demo':await foundation.demo();emit();break;
        case 'host-open':await foundation.open();emit();break;
        case 'registry-resume':{const answer=await dialog.showMessageBox(win,{type:'question',message:'Resume observed ownership time?',detail:'Unobserved sleep, stall and restart time will not be counted. Signing stays disabled unless a temporary demo key is currently present.',buttons:['Keep paused','Resume from now'],defaultId:0,cancelId:0});if(answer.response===1)foundation.resume();emit();break;}
        case 'host-folder':await foundation.choose();emit();break;
        case 'host-refresh':await foundation.refresh();emit();break;
        case 'owner-confirm':foundation.confirm();emit();break;
        case 'host-checkin':foundation.checkin();emit();break;
        case 'plugin-remove':plugin=null;emit();break;
        case 'plugin-install':{const choice=await dialog.showOpenDialog(win,{title:'Open Woo declarative plugin manifest',properties:['openFile'],filters:[{name:'Woo plugin JSON',extensions:['json']}]});if(choice.canceled)break;const f=choice.filePaths[0];if(fs.statSync(f).size>32768)throw Error('Plugin exceeds 32 KiB');const api=require('../sdk/extensions.cjs');const candidate=api.validatePlugin(JSON.parse(fs.readFileSync(f,'utf8')));const consent=await dialog.showMessageBox(win,{type:'question',title:'Extension permissions',message:candidate.title,detail:'Allow only these capabilities for this session?\n'+candidate.capabilities.join('\n')+'\nNo executable code, page access, filesystem, credentials or network access is granted.',buttons:['Deny','Allow listed capabilities'],defaultId:0,cancelId:0});if(consent.response!==1)throw Error('Plugin permission denied');plugin=api.authorizePlugin(candidate,candidate.capabilities);emit();break;}
        case 'state':emit();break;
        case 'discover':if(typeof payload!=='string'||payload.length>4096)throw Error('Invalid query');tabs.showSearch(payload.trim(),discovery.search(payload.trim()),discovery.scope);break;
        case 'go':await navigate(payload);break;
        case 'search':await tabs.navigate(require('./web-search.cjs').searchURL(payload,settings.searchProvider));break;
        case 'tab-new':tabs.add();win.webContents.focus();win.webContents.send('woo:focus-address');break;
        case 'tab-select':tabs.select(payload);break;
        case 'tab-close':tabs.close(payload);break;
        case 'home':tabs.home();break;
        case 'back':case 'forward':tabs.history(action);break;
        case 'reload':tabs.reload();break;
        case 'panel':tabs.internal('settings');break;
        case 'close-panel':tabs.history('back');break;
        case 'settings':settings.endpoint=policy.endpoint(payload);atomic(settingsFile,settings);emit();break;
        case 'search-provider':if(typeof payload!=='string'||!Object.hasOwn(require('./web-search.cjs').providers,payload))throw Error('Unknown search provider');settings.searchProvider=payload;settings.searchProviderChosen=true;atomic(settingsFile,settings);emit();break;
        case 'put':if(typeof payload?.replace!=='boolean')throw Error('Invalid change');registry.put(payload.record,payload.replace);emit();break;
        case 'remove':registry.remove(policy.name(payload));emit();break;
        case 'export':{const choice=await dialog.showSaveDialog(win,{title:'Export Woo snapshot',defaultPath:'woo-registry.json',filters:[{name:'JSON',extensions:['json']}]});if(!choice.canceled)atomic(choice.filePath,registry.read());break;}
        case 'import':{const choice=await dialog.showOpenDialog(win,{title:'Merge Woo snapshot (conflicts rejected)',properties:['openFile'],filters:[{name:'JSON',extensions:['json']}]});if(!choice.canceled){const file=choice.filePaths[0];if(fs.statSync(file).size>1024*1024)throw Error('Snapshot exceeds 1 MiB');registry.import(fs.readFileSync(file,'utf8'));emit();}break;}
        default:throw Error('Unknown action');
      }
      return {ok:true};
    }catch(e){return {ok:false,error:e.message};}
  });
  let quitting=false;app.on('before-quit',event=>{if(!quitting){event.preventDefault();quitting=true;cancelImport();experiment.close();updates.stop();foundation.close().finally(()=>app.quit());}});
  win.on('resize',bounds);win.on('resized',bounds);win.on('maximize',()=>setTimeout(bounds,150));win.on('unmaximize',()=>setTimeout(bounds,150));win.on('closed',()=>{tabs.destroy();proxy.close();app.quit();});
  await win.loadFile(path.join(__dirname,'index.html'));bounds();win.show();emit();updates.start();
  if(!app.isPackaged&&process.argv.includes('--projects-test'))require('../test/projects-ui.cjs').run({app,win,tabs,foundation,registry,dir,navigate}).catch(e=>{fs.writeFileSync(path.join(dir,'projects-fatal.txt'),e.stack);app.exit(1);});
  if(!app.isPackaged&&process.argv.includes('--onboarding-test'))require('../test/onboarding-ui.cjs').run({app,win,tabs,foundation,registry,dir}).catch(e=>{fs.writeFileSync(path.join(dir,'onboarding-fatal.txt'),e.stack);app.exit(1);});
  if(!app.isPackaged&&(process.argv.includes('--redesign-test')||process.argv.includes('--tabs-search-test')||process.argv.includes('--update-ui-test')))require('../test/redesign-ui.cjs').run({app,win,tabs,foundation,registry,dir,navigate,getSettingsWindow:()=>settingsWin}).catch(e=>{fs.writeFileSync(path.join(dir,'redesign-fatal.txt'),e.stack);app.exit(1);});
  if(process.argv.includes('--usability-test'))require('../test/usability055-ui.cjs').run({app,win,tabs,foundation,dir,navigate,shell}).catch(e=>{fs.writeFileSync(path.join(dir,'usability-fatal.txt'),e.stack);app.exit(1);});
  if(process.argv.includes('--settings053-test'))require('../test/settings053-ui.cjs').run({app,win,tabs,foundation,dir,navigate,getSettingsWindow:()=>settingsWin,dialog}).catch(e=>{fs.writeFileSync(path.join(dir,'settings053-fatal.txt'),e.stack);app.exit(1);});
  if(process.argv.includes('--experimental-test'))require('../test/experimental-ui.cjs').run({app,win,tabs,foundation,dir,experiment,openExperiment,getExperimentWindow:()=>experimentWin,dialog}).catch(e=>{fs.writeFileSync(path.join(dir,'experimental-fatal.txt'),e.stack);app.exit(1);});
  if(process.argv.includes('--patch044-test'))require('../test/patch044-ui.cjs').run({app,win,tabs,foundation,dir,navigate}).catch(e=>{fs.writeFileSync(path.join(dir,'patch044-fatal.txt'),e.stack);app.exit(1);});
  if(process.argv.includes('--everyday-test'))require('../test/everyday-ui.cjs').run({app,win,tabs,foundation,dir,navigate,getSettingsWindow:()=>settingsWin}).catch(e=>{fs.writeFileSync(path.join(dir,'everyday-fatal.txt'),e.stack);app.exit(1);});
  if(process.argv.includes('--motion-test'))require('../test/motion-ui.cjs').run({app,win,tabs,foundation,dir,navigate}).catch(e=>{fs.writeFileSync(path.join(dir,'motion-fatal.txt'),e.stack);app.exit(1);});
  if(process.argv.includes('--release-test'))require('../test/release-ui.cjs').run({app,win,tabs,foundation,registry,dir,navigate,getSettingsWindow:()=>settingsWin}).catch(e=>{fs.writeFileSync(path.join(dir,'release-fatal.txt'),e.stack);app.exit(1);});
  if(process.argv.includes('--branding-test')){const result={name:app.getName(),version:app.getVersion(),windowTitle:win.getTitle(),appUserModelIdConfigured:branding.APP_USER_MODEL_ID,profileDirectory:branding.PROFILE_DIRECTORY,actualTestProfile:app.getPath('userData'),iconStatus:'shared-svg-integrated'};fs.writeFileSync(path.join(dir,'branding-runtime.json'),JSON.stringify(result,null,2));app.quit();return;}
  if(!app.isPackaged&&process.argv.includes('--self-test'))require('../test/ui-runner.cjs').run({app,win,view:tabs.active.view,navigate,registry,dir,state:()=>tabs.state,emit,visible,proxy}).catch(e=>{fs.writeFileSync(path.join(dir,'ui-test-fatal.txt'),e.stack);app.exit(1);});
  if(!app.isPackaged&&process.argv.includes('--foundation-test'))require('../test/foundation-ui.cjs').run({app,win,foundation,dir}).catch(e=>{fs.writeFileSync(path.join(dir,'foundation-fatal.txt'),e.stack);app.exit(1);});
}
app.on('window-all-closed',()=>{if(!process.argv.includes('--serve-registry'))app.quit();});
