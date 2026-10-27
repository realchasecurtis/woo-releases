'use strict';
// Main-owned development integration. No IPC endpoint, network or automatic activation.
class PublishingPreview {
 constructor({client,publisher,renderer,tabs,exporter,development=false}){if(development!==true)throw Error('Publishing preview unavailable');Object.assign(this,{client,publisher,renderer,tabs,exporter});this.epoch=0;this.closed=false;this.current=null;this.state={phase:'idle',scope:'injected test catalogue only',claimsOpen:false};}
 async run(phase,operation){if(this.closed)throw Error('Closed');if(this.busy)throw Error('Busy');this.busy=true;const epoch=this.epoch;this.state={...this.state,phase};try{const value=await operation();if(epoch!==this.epoch||this.closed)throw Error('Cancelled');this.state={...this.state,phase:'ready'};return value;}catch(e){if(epoch===this.epoch)this.state={...this.state,phase:/revoked/i.test(e.message)?'revoked':'unavailable',message:e.message};throw e;}finally{this.busy=false;}}
 create(){return this.run('creating',()=>this.publisher.create());}
 publish(files,{consent=false}={}){if(consent!==true)throw Error('Explicit test publication consent required');return this.run('packaging-and-publishing',()=>this.publisher.publish(files));}
 search(query){return this.run('discovering',()=>this.client.search(query));}
 async open(name){return this.run('resolving',async()=>{const epoch=this.epoch,result=await this.client.open(name);if(epoch!==this.epoch||this.closed)throw Error('Cancelled');this.state={...this.state,phase:'rendering'};const item=await this.renderer.open(result.record,result.bundle,{embedded:true});if(epoch!==this.epoch||this.closed){item.dispose();throw Error('Cancelled');}try{const tab=this.tabs.adoptNative(item,{background:false});this.current={result,documentIdentity:item.identity,tabId:tab.id};return {tabId:tab.id,revision:result.record.revision,scope:'test catalogue'};}catch(e){item.dispose();throw e;}});}
 saveIntent(asset){if(!this.current||this.closed)throw Error('No verified publication');const {result,documentIdentity}=this.current;return this.exporter.issue({record:result.record,bundle:result.bundle,asset,documentIdentity});}
 async revokeView(){this.epoch++;this.current=null;await this.exporter?.revoke();await this.renderer.stop();this.state={...this.state,phase:'revoked'};}
 async close(){this.closed=true;await this.revokeView();}
}
module.exports={PublishingPreview};
