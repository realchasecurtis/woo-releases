'use strict';
const policy=require('../src/policy.cjs');
const examples=['bunker','woo'];
const proposed=['hab','lun','exo','ast','lgr','syn','apl','wpg','wst','svc','prg','gui'];
function siteName(label,ending){if(typeof label!=='string'||typeof ending!=='string')throw Error('Enter a site name and choose an ending.');const stem=label.trim().toLowerCase(),suffix=ending.trim().toLowerCase();if(!/^[a-z][a-z0-9-]{1,61}[a-z0-9]$|^[a-z][a-z0-9]?$/.test(stem))throw Error('Use letters, numbers and interior hyphens for the site name.');if(!/^[a-z][a-z0-9-]{0,61}[a-z0-9]$/.test(suffix))throw Error('Choose an ending with at least two letters/characters.');const n=policy.name(stem+'.'+suffix);require('./namespace.cjs').assertClaimable(n);return n;}
function validateDraft(d){if(!d||!['starter','folder'].includes(d.source))throw Error('Choose the starter page or your own static folder.');if(d.acknowledgeLocalOnly!==true)throw Error('Confirm that this is a temporary local preview, not public registration.');const name=siteName(d.label,d.ending);if(typeof d.title!=='string'||d.title.trim().length<1||d.title.length>120||/[\x00-\x1f]/.test(d.title))throw Error('Add a title between 1 and 120 characters.');return {name,title:d.title.trim(),source:d.source};}
module.exports={apiVersion:1,examples,proposed,siteName,validateDraft};
