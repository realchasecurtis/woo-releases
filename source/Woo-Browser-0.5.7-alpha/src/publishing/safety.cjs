'use strict';
// Conservative until contract supplies structured per-name safety transitions.
exports.invalidate=async({client,renderer,tabs,names})=>{for(const name of names)client.forgetRetained(name);for(const t of [...tabs.tabs])if(names.has(t.native?.record?.name))tabs.close(t.id);await renderer.stop();};
