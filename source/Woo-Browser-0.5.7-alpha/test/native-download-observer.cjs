'use strict';
// Acceptance-only observer. Never sets a save path, changes marking or opens files.
exports.install=({session,dir,fixtureDir})=>{
 const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
 const root=path.resolve(fixtureDir);if(!path.isAbsolute(fixtureDir)||fs.lstatSync(root).isSymbolicLink())throw Error('Owned ordinary fixture directory required');
 const receipts=[];let received=0;const write=()=>fs.writeFileSync(path.join(dir,'native-download-receipts.json'),JSON.stringify({budget:32*1024*1024,received,receipts},null,2));
 session.on('will-download',(event,item,wc,frame)=>{
  if(event.defaultPrevented)return;
  const row={state:'started',gesture:item.hasUserGesture(),initiator:item.getInitiatorOrigin(),frameMatches:frame===wc.mainFrame,received:0};receipts.push(row);write();let previous=0;
  item.on('updated',()=>{const bytes=item.getReceivedBytes();received+=Math.max(0,bytes-previous);previous=bytes;row.received=bytes;if(received>=32*1024*1024){row.budgetCancelled=true;item.cancel();}write();});
  item.once('done',(_event,state)=>{row.state=state;row.received=item.getReceivedBytes();try{if(state==='completed'){const file=path.resolve(item.getSavePath());if(!file.startsWith(root+path.sep))throw Error('Destination outside owned fixture directory; not inspected');const stat=fs.lstatSync(file);if(stat.isSymbolicLink()||!stat.isFile()||stat.size>1024*1024)throw Error('Only small ordinary inert completion fixtures inspected');row.name=path.basename(file);row.bytes=stat.size;row.sha256=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');const marking=fs.readFileSync(file+':Zone.Identifier','utf8');row.internetZone=/^ZoneId=[34]\s*$/m.test(marking);if(!row.internetZone)throw Error('Missing Internet/Restricted ZoneId');row.markingVerified=true;}}catch(e){row.markingVerified=false;row.error=e.message;}write();});
 });
};
