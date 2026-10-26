'use strict';
const {app,BrowserWindow,WebContentsView,session}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const sdk=require('../sdk/index.cjs');
const CSP="default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; media-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; worker-src 'none'";
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
class NativeRenderer {
 constructor({pinFile}={}){this.client=new sdk.VerifiedSiteClient({file:pinFile});this.sessions=new Map();this.windows=new Set();this.activeNames=new Map();}
 async open(record,bundle,{embedded=false}={}){
  this.client.acceptOwnership(record);const {files,identity}=this.client.verify(record,bundle),origin='woo-site://'+identity;
  const previous=this.activeNames.get(record.name);if(previous&&previous!==identity){const old=this.sessions.get(previous);if(old){old.active=false;for(const item of [...this.windows])if(item.identity===previous)item.dispose();}}
  this.activeNames.set(record.name,identity);
  let entry=this.sessions.get(identity);
  if(!entry){
   // Avoid repeating the long origin in Windows LevelDB paths. Bind the short
   // directory to its FULL identity, and reject any collision instead of sharing.
   const storage=path.join(app.getPath('userData'),'site-data',sdk.hash(identity).slice(0,32));
   if(process.platform==='win32'&&storage.length>140)throw Error('Profile path too long for native site storage; choose a shorter --data-dir.');
   fs.mkdirSync(storage,{recursive:true});const marker=path.join(storage,'woo-origin.txt');
   if(fs.existsSync(marker)){if(fs.readFileSync(marker,'utf8')!==identity)throw Error('Site storage identity collision');}else fs.writeFileSync(marker,identity,{flag:'wx'});
   const ses=session.fromPath(storage);entry={ses,active:true,versions:new Map()};this.sessions.set(identity,entry);
   ses.setPermissionRequestHandler((_w,_p,cb)=>cb(false));ses.setPermissionCheckHandler(()=>false);ses.on('will-download',e=>e.preventDefault());
   ses.webRequest.onBeforeRequest((details,cb)=>cb({cancel:!entry.active||!details.url.startsWith(origin+'/')}));
   ses.protocol.handle('woo-site',request=>{const u=new URL(request.url);if(!entry.active||u.protocol+'//'+u.host!==origin||request.method!=='GET'||u.username||u.password||u.port)return new Response('Identity denied',{status:403});let pathname;try{pathname=decodeURIComponent(u.pathname);}catch{return new Response('Invalid path',{status:400});}const match=/^\/v([1-9][0-9]*)(\/.*)$/.exec(pathname),f=match?entry.versions.get(Number(match[1]))?.get(match[2]):null;return f?new Response(f.bytes,{headers:{'Content-Type':f.mime,'Content-Security-Policy':CSP,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Cross-Origin-Resource-Policy':'same-origin'}}):new Response('Not verified',{status:404});});
  }
  entry.active=true;entry.versions.set(record.revision,files);while(entry.versions.size>8)entry.versions.delete(entry.versions.keys().next().value);
  const win=embedded?null:new BrowserWindow({width:1100,height:800,icon:path.join(__dirname,'assets','woo-icon.png'),title:'Woo Host · '+record.name,backgroundColor:'#101c2d',webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,webviewTag:false}});
  const view=new WebContentsView({webPreferences:{session:entry.ses,sandbox:true,contextIsolation:true,nodeIntegration:false,nodeIntegrationInWorker:false,nodeIntegrationInSubFrames:false,webSecurity:true,webviewTag:false,allowRunningInsecureContent:false}});if(win)win.contentView.addChildView(view);
  const item={win,view,record,origin,identity,session:entry.ses,dispose:()=>{if(win&&!win.isDestroyed())win.destroy();else if(view.webContents&&!view.webContents.isDestroyed())view.webContents.close();this.windows.delete(item);}};this.windows.add(item);view.webContents.once('destroyed',()=>this.windows.delete(item));
  const resize=()=>{const [w,h]=win.getContentSize();view.setBounds({x:0,y:115,width:w,height:Math.max(1,h-115)});};if(win){win.on('resize',resize);resize();}
  const header=`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';"><style>body{margin:0;padding:13px 22px;background:#101c2d;color:#cce9e3;font:12px Segoe UI}b{font-size:20px}small{display:block;margin-top:8px;color:#a0b8c9;overflow-wrap:anywhere}</style><b>${esc(record.name)} · verified local snapshot</b><small>Actual origin: ${origin} · generation ${record.generation} · revision ${record.revision}</small><small>Owner: ${record.owner} · DEMO identity / local only / no HTTPS impersonation</small>`;
  if(win)await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(header));
  const guard=(e,url)=>{try{const u=new URL(url);if(!entry.active||u.protocol!=='woo-site:'||u.host!==identity||!u.pathname.startsWith('/v'+record.revision+'/'))throw Error();}catch{e.preventDefault();}};
  view.webContents.on('will-navigate',guard);view.webContents.on('will-redirect',guard);view.webContents.on('will-frame-navigate',e=>guard(e,e.url));view.webContents.setWindowOpenHandler(()=>({action:'deny'}));if(win){win.webContents.on('will-navigate',e=>e.preventDefault());win.webContents.setWindowOpenHandler(()=>({action:'deny'}));}
  if(win)win.on('closed',()=>{if(view.webContents&&!view.webContents.isDestroyed())view.webContents.close();this.windows.delete(item);});await view.webContents.loadURL(origin+'/v'+record.revision+'/index.html');if(win)win.show();return item;
 }
 async stop(){for(const entry of this.sessions.values())entry.active=false;for(const item of [...this.windows])item.dispose();}
 async close(){for(const item of [...this.windows])item.dispose();for(const entry of this.sessions.values()){await entry.ses.cookies.flushStore();entry.ses.flushStorageData();}}
}
module.exports={NativeRenderer,CSP};
