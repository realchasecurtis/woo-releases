'use strict';
const {createSearch}=require('../sdk/search.cjs');
const search=createSearch({aliases:[{title:'My documentation',names:['manual','handbook'],url:'https://example.com/',kind:'User-curated example'}],weights:{exact:200,prefix:90,token:60,typo:20},providers:[()=>[{title:'Local team directory example',names:['team'],url:'https://example.org/',kind:'Custom local provider example'}]]});
console.log(JSON.stringify({manual:search.decision('handbook'),team:search.suggest('team')},null,2));
// An update client can use UpdateChecker from sdk/updates.cjs with its own
// explicitly selected endpoint, pinned public key and downloadOrigins.
// No key generation, remote requests or trust replacement occurs in this example.
