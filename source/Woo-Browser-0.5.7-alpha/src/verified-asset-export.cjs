'use strict';
// Main-process composition only. Never expose issuer or adapter to page/renderer IPC.
const {verifyBundle}=require('../sdk/host.cjs');
const MAX_BYTES=1024*1024;
const fail=code=>Object.assign(new Error(code),{code});
class AssetExport {
 #pending=null;#epoch=0;#job=null;#closed=false;
 constructor(adapter){this.adapter=adapter;}
 issue({record,bundle,asset,documentIdentity}){
  if(this.#closed)throw fail('closed');
  // Caller must supply ownership from the trusted registry/pinned client, NOT page data.
  const files=verifyBundle(bundle,record),f=files.get(asset);
  if(!f||!Buffer.isBuffer(f.bytes)||f.bytes.length>MAX_BYTES)throw fail('asset_limit');
  const suggested=asset.split('/').pop();
  if(!suggested||suggested.length>120||/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(suggested))throw fail('unsafe_name');
  if(typeof documentIdentity!=='string'||!documentIdentity||documentIdentity.length>512)throw fail('invalid_identity');
  const token=Object.freeze({});if(this.#pending)this.#pending.data.bytes.fill(0);this.#pending={token,data:{bytes:Buffer.from(f.bytes),suggested,documentIdentity,epoch:this.#epoch}};return token;
 }
 async save(intent,{platform,documentIdentity}={}){
  if(this.#closed)throw fail('closed');if(this.#job)throw fail('busy');
  const data=this.#pending?.token===intent?this.#pending.data:null;if(data)this.#pending=null;
  if(!data)throw fail('invalid_intent');
  const a=this.adapter;
  
  const controller=new AbortController(),epoch=this.#epoch;let transaction=null;
  const alive=()=>{if(controller.signal.aborted||this.#closed||epoch!==this.#epoch)throw fail('cancelled');};
  const job={controller,work:null,cleanupError:null,cleanupFailed:false};
  const work=Promise.resolve().then(async()=>{try{
   if(data.epoch!==this.#epoch||data.documentIdentity!==documentIdentity)throw fail('invalid_intent');
   alive();if(!['win32','darwin'].includes(platform)||a.supportsSafetyMarking(platform)!==true)throw fail('marking_unavailable');
   const destination=await a.chooseDestination({suggestedName:data.suggested,bytes:data.bytes.length,signal:controller.signal});alive();
   if(destination===null)return {status:'cancelled'};
   // destination is an opaque native-adapter object, never a renderer-selected path.
   if(!destination||typeof destination!=='object')throw fail('invalid_destination');
   transaction=await a.begin(destination,{exclusive:true,maxBytes:MAX_BYTES,signal:controller.signal});alive();
   await a.write(transaction,Buffer.from(data.bytes),{signal:controller.signal});alive();
   if(await a.mark(transaction,{platform,zone:'internet',signal:controller.signal})!==true)throw fail('marking_failed');alive();
   // Adapter MUST atomically refuse commit when signal aborted; settle only after closing handles.
   const receipt=await a.commit(transaction,{signal:controller.signal});if(receipt?.committed!==true)throw fail('invalid_commit_receipt');transaction=null;
   return {status:'saved',bytes:data.bytes.length,...(controller.signal.aborted?{lateCancellation:true}:{})};
  }finally{try{if(transaction!==null)await a.abort(transaction);}catch(e){job.cleanupFailed=true;job.cleanupError=e;throw e;}finally{data.bytes.fill(0);}}});
  job.work=work;this.#job=job;try{return await work;}finally{this.#job=null;}
 }
 async revoke(){this.#epoch++;if(this.#pending){this.#pending.data.bytes.fill(0);this.#pending=null;}const j=this.#job;if(j){j.controller.abort();await j.work.catch(()=>{});if(j.cleanupFailed)throw j.cleanupError;}}
 async close(){this.#closed=true;await this.revoke();}
}
module.exports={AssetExport,MAX_BYTES};

