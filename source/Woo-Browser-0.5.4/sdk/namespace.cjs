'use strict';
const names=Object.freeze(['map.woo','translate.woo','weather.woo','code.woo','community.woo']);
function isReserved(name){return typeof name==='string'&&names.includes(name.trim().toLowerCase());}
function assertClaimable(name){if(isReserved(name))throw Error(name+' is reserved by this Woo distribution. It is a built-in shortcut, not available for ordinary claims.');}
module.exports={apiVersion:1,names,isReserved,assertClaimable};
