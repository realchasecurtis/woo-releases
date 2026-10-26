'use strict';
const policy=require('./policy.cjs');
const providers=Object.freeze({bing:{name:'Bing',origin:'https://www.bing.com',path:'/search',parameter:'q'},duckduckgo:{name:'DuckDuckGo',origin:'https://duckduckgo.com',path:'/',parameter:'q'},google:{name:'Google',origin:'https://www.google.com',path:'/search',parameter:'q'}});
function searchURL(query,id='google'){if(typeof query!=='string'||!query.trim()||query.length>2048)throw Error('Search query must contain 1–2048 characters');const p=Object.hasOwn(providers,id)?providers[id]:null;if(!p)throw Error('Unknown search provider');const u=new URL(p.path,p.origin);u.searchParams.set(p.parameter,query.trim());return policy.destination(u.href);}
function isAddress(input){return /^[a-z][a-z0-9+.-]*:/i.test(input)||(!/\s/.test(input)&&input.includes('.'));}
module.exports={apiVersion:1,providers,searchURL,isAddress};
