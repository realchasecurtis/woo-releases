'use strict';
// CONNECT tunnel pins each connection to a validated public IPv4 address.
// TLS remains Chromium-to-origin; Woo never terminates or replaces TLS.
const http=require('node:http'), net=require('node:net');
const {publicAddress}=require('./policy.cjs');
async function startProxy() {
  const sockets=new Set();
  const server=http.createServer((_req,res)=>{res.writeHead(403);res.end('HTTPS only');});
  server.on('connection',s=>{sockets.add(s);s.on('close',()=>sockets.delete(s));s.on('error',()=>{});});
  server.on('connect',async(req,client,head)=>{
    let upstream;
    try {
      const match=/^([a-zA-Z0-9.-]+):443$/.exec(req.url);if(!match) throw Error('Invalid tunnel target');
      const ip=await publicAddress(match[1]);if(client.destroyed)return;
      upstream=net.connect({host:ip,port:443}); sockets.add(upstream);
      upstream.setTimeout(30000,()=>upstream.destroy());
      upstream.on('close',()=>{sockets.delete(upstream);client.destroy();});
      upstream.on('error',()=>client.destroy()); client.on('close',()=>upstream.destroy());
      upstream.on('connect',()=>{client.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)upstream.write(head);client.pipe(upstream);upstream.pipe(client);});
    } catch {client.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');if(upstream)upstream.destroy();}
  });
  await new Promise((r,j)=>{server.once('error',j);server.listen(0,'127.0.0.1',r);});
  return {port:server.address().port,close:()=>{for(const s of sockets)s.destroy();server.close();}};
}
module.exports={startProxy};
